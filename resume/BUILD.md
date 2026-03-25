# Resume Build Instructions

## Prerequisites

Install Typst:

```bash
brew install typst
```

## Generate PDF

From the repo root:

```bash
typst compile resume/resume.typ resume/resume.pdf
```

## Deploy to site

Copy the generated PDF to the public directory so it's served at `osim.dev/resume.pdf`:

```bash
cp resume/resume.pdf public/Goran_Osim_Resume.pdf
```

## Edit

The resume source is `resume.typ`. It's plain text — edit it directly, then recompile.
