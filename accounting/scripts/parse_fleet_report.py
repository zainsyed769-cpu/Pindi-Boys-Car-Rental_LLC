#!/usr/bin/env python3
"""Extract the RTA "Report Of Vehicles" PDF into a flat CSV.

The report is a fixed-column Oracle Reports print-out, so columns are
recovered from word x-coordinates (pdftotext -bbox-layout) rather than
from whitespace, which is unreliable when a cell wraps onto a second line.

Usage:
    python3 parse_fleet_report.py "Fleet report ....pdf" out.csv

Requires poppler-utils (pdftotext).
"""
import csv, re, subprocess, sys, tempfile
import xml.etree.ElementTree as ET

NS = '{http://www.w3.org/1999/xhtml}'

# (column name, x-min, x-max) taken from the report header positions.
BOUNDS = [
    ('model', 0, 110), ('chassis', 110, 200), ('plate', 200, 270), ('year', 270, 300),
    ('reg_days', 300, 380), ('fines_count', 380, 440), ('fines_amount', 440, 490),
    ('ins_issue', 490, 540), ('ins_expiry', 540, 580), ('insurer', 580, 665),
    ('mortgagee', 665, 9999),
]
SKIP = ('Model', 'Page:', 'Report')


def column_for(x):
    for name, lo, hi in BOUNDS:
        if lo <= x < hi:
            return name
    return None


def parse(pdf_path):
    with tempfile.NamedTemporaryFile(suffix='.xml') as tmp:
        subprocess.run(['pdftotext', '-bbox-layout', pdf_path, tmp.name], check=True)
        root = ET.parse(tmp.name).getroot()

    rows = []
    for page in root.iter(NS + 'page'):
        words = sorted(
            (float(w.get('yMin')), float(w.get('xMin')), (w.text or '').strip())
            for w in page.iter(NS + 'word') if (w.text or '').strip()
        )
        lines = []
        for y, x, text in words:
            if lines and abs(y - lines[-1][0]) <= 3:
                lines[-1][1].append((x, text))
            else:
                lines.append([y, [(x, text)]])

        for _, line_words in lines:
            cells = {}
            for x, text in sorted(line_words):
                cells.setdefault(column_for(x), []).append(text)
            record = {k: ' '.join(v) for k, v in cells.items() if k}
            flat = ' '.join(sum(cells.values(), []))

            if re.fullmatch(r'[A-Z0-9]{15,18}', record.get('chassis', '')):
                rows.append(record)                      # start of a vehicle row
            elif rows and not any(h in flat for h in SKIP):
                for key, value in record.items():        # wrapped continuation line
                    if key == 'chassis':
                        continue
                    rows[-1][key] = (rows[-1].get(key, '') + ' ' + value).strip()

    for row in rows:
        for key in list(row):
            row[key] = re.sub(r'\s+', ' ', row[key]).strip()
        row['plate'] = row.get('plate', '').replace('Private ', '').replace('Motorcycle 1', 'Motorcycle')
    return rows


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    rows = parse(sys.argv[1])
    with open(sys.argv[2], 'w', newline='') as handle:
        writer = csv.DictWriter(handle, [name for name, _, _ in BOUNDS])
        writer.writeheader()
        for row in rows:
            writer.writerow({name: row.get(name, '') for name, _, _ in BOUNDS})
    print(f'{len(rows)} vehicles -> {sys.argv[2]}')


if __name__ == '__main__':
    main()
