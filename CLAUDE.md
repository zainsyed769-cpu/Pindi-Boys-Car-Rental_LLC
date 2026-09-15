# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this repository is

This is **not a software codebase** — it is a **business records repository** for
**Pindi Boys Car Rental L.L.C**, a vehicle rental company based in Dubai, UAE. The
repository stores the company's official documents (fleet, finance, and licensing
records) as PDF files under version control.

There is **no application code, build system, package manager, test suite, or CI**
in this repository. Do not invent or assume any. Treat requests to "build", "run",
"test", or "lint" with skepticism — none of those workflows exist here unless the
user is asking you to *create* them from scratch.

## Repository contents

All files live in the repository root. Current files:

| File | Type | Description |
|------|------|-------------|
| `README.md` | Markdown | One-line project description. |
| `CLAUDE.md` | Markdown | This guidance file. |
| `Fleet report 12:Oct:2025 pindi Boys .pdf` | PDF | RTA (Roads & Transport Authority, Dubai) "Report Of Vehicles" listing the fleet (~50 vehicles): model, chassis/VIN, plate number, make year, registration validity, traffic fines count and amount, insurance company, and the bank that holds the mortgage (finance) on each vehicle. |
| `Pindi Boys Car Rental Bank Statement 1 January 2025 til 30 September 2025.pdf` | PDF | Company bank statement covering Jan 1 – Sep 30, 2025. |
| `Pindi Boys Trade Licance 2026.pdf` | PDF | The company's UAE trade license (2026). |
| `Pindi_Boys_Loan_Sheet_2025_Landscape.pdf` | PDF | Monthly loan/installment schedule (one row per financed vehicle, columns per month) totalling the company's monthly repayment obligations to the financing banks. |
| `Logo Pindi Boys.pdf` | PDF | Company logo artwork. |

Notes on naming:
- File names are human-authored and **not normalized** — they contain spaces,
  colons (`:`), mixed casing, and a misspelling (`Licance`). Some tools and
  shells need the names quoted or escaped. Preserve existing names unless the
  user explicitly asks to rename.
- The repository name `Pindi-Boys-Car-Rental_LLC` and the company name
  `Pindi Boys Car Rental L.L.C` refer to the same entity.

## Domain context (so you can read the documents correctly)

- **Currency** is UAE Dirhams (AED). Fine amounts and loan figures are in AED.
- **Plate numbers** follow the Dubai format (e.g. `Private H 82490`, plus
  motorcycle plates and category codes like `AA`, `EE`).
- **Financing/mortgage**: most vehicles are financed by UAE banks — Emirates
  Islamic Bank, Dubai Islamic Bank, Emirates NBD, First Abu Dhabi Bank — shown in
  the "Mortgaged by" column of the fleet report and as monthly rows in the loan
  sheet.
- **Insurance**: provided primarily by Adamjee Insurance, Dubai Insurance Company,
  and Al Ain Ahlia Insurance.
- The **loan sheet** uses date-stamped columns (e.g. `2026-02-01`) with the
  monthly installment per vehicle; `nan` means no payment due that month, and the
  final row is the monthly total across the fleet.

## How to work in this repository

### Reading documents
- Use the **Read** tool to open PDFs directly — it extracts text and renders pages.
  This is the primary way to answer questions about the fleet, finances, or license.
- When citing figures, quote them exactly as they appear and name the source
  document and (where useful) the page.

### Common tasks you may be asked to do
- **Answer questions** about the fleet, fines, financing, or finances by reading
  the relevant PDF.
- **Summarize or extract** data (e.g. "total monthly loan obligation", "which
  vehicles have the most fines", "which vehicles' registration expires soon").
- **Generate derived artifacts** — e.g. a CSV/spreadsheet, a Markdown table, a
  chart, or a script that parses a PDF. If you create code or data files, place
  them in a clearly named subdirectory and explain what they do.
- **Improve documentation** (README, this file).

### Conventions to follow
- **Do not modify the source PDFs.** They are records of truth. If a task needs a
  transformed version, write a *new* file and leave the originals untouched.
- **Handle data as sensitive.** These documents contain confidential business and
  financial information (bank statements, VINs, plate numbers, license details).
  Do not paste their contents into external services, and only surface the
  specific figures the user asks for.
- **Preserve exact file names** unless asked to rename; quote them in shell
  commands because of the spaces and colons.
- Keep any new text files in **UTF-8** and use clear, descriptive names
  (the established style is `Title_Case_With_Underscores` or descriptive spaced
  names).

## Git workflow

- Default branch: `main`.
- Standard flow: create a feature branch, commit with a clear message, push with
  `git push -u origin <branch>`, then open a pull request.
- Commit only what the user asked for; never commit generated scratch files or
  transformed copies unless requested.
- Because this repo holds confidential records, double-check before pushing that
  you are not adding any new sensitive data the user did not intend to publish.

## If asked to turn this into an application

There is no app here today. If the user wants to build software around these
records (e.g. a fleet-management dashboard, a loan tracker, a data pipeline),
treat it as a greenfield project: confirm the desired stack and structure first,
scaffold it in a subdirectory, and then update this file to document the new
code, build, and test workflows.
