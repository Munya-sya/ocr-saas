# SEO Content Foundation & Ad-Safe Free Tier: Review Checklist

This checklist defines the quality, legal, and advertising compliance standards for the ScanText OCR SaaS platform. Every content update, ad integration, and SEO deployment must be reviewed against these criteria prior to production release.

---

## 1. Editorial Originality & Content Quality (Anti-Thin-Content Policy)

- [x] **No Thin Keyword Pages**: Every guide page must provide substantial, standalone educational value (at least 800+ words of original technical explanation).
- [x] **Distinct Technical Focus**:
  - `/how-to-extract-text-from-image`: Core end-to-end OCR pipeline (binarization, layout analysis, neural LSTM character classification).
  - `/jpg-to-text`: Discrete Cosine Transform (DCT) 8x8 block compression, ringing halos around high-contrast edges, Otsu adaptive thresholding.
  - `/png-to-text`: Lossless DEFLATE typography advantages, RGBA alpha channel transparency flattening against white backgrounds.
  - `/pdf-to-text`: Critical distinction between native vector digital PDFs and scanned raster image PDFs; Poppler rasterization at 300 DPI; asynchronous Celery batch queues.
  - `/screenshot-to-text`: Low-DPI screen font challenges (72-96 DPI), ClearType subpixel anti-aliasing color fringe, dark mode automated polarity inversion.
  - `/how-to-improve-ocr-accuracy`: In-depth computer vision preprocessing (DPI benchmarks, Hough transform deskewing, Tesseract PSM 1-13 page segmentation modes).
- [x] **Actionable Technical Depth**: Guides include practical formulas, code explanations (OpenCV matrix manipulations), and real-world failure cases rather than generic marketing copy.

---

## 2. Accuracy Disclaimers & Consumer Protection

> [!CAUTION]
> **Strict Prohibition**: Never claim, guarantee, or imply 100% character recognition accuracy in any marketing, tool copy, or guide.

- [x] **Zero-Guarantee Principle**: All guide pages, tool interfaces, and legal terms prominently state that OCR is a probabilistic, machine-learning-based classification technology.
- [x] **Variance Factors Documented**: Clear explanation of unavoidable accuracy variables:
  - Low resolution (< 150 DPI) causing serif stroke merging.
  - Geometric perspective skew (> 2-3 degrees) breaking line segmentation.
  - Uneven illumination, camera flash hot spots, and shadow gradients.
  - Cursive handwriting and decorative script fonts.
- [x] **Human Review Warning**: Terms of Service and guide footers advise human verification before using extracted text in legal, medical, financial, or contractual environments.

---

## 3. Ad Placement Safety & Pro Suppression (`AdSlot`)

- [x] **Pro Tier Suppression**:
  - Pro subscribers (`planTier === 'pro'`) must **never** receive ad markup, tracking scripts, or ad containers.
  - Implemented cleanly in `AdSlot.tsx`:
    ```typescript
    if (user?.planTier === 'pro') return null;
    ```
- [x] **Strict Proximity Rules (Accidental Click Prevention)**:
  - **Allowed Placements**:
    1. Below the upload form / controls container.
    2. Below completed OCR results.
  - **Forbidden Placements**: Never place ads beside or inside actionable UI controls:
    - ❌ Beside or inside **Upload / Dropzone** buttons.
    - ❌ Beside or inside the **Extract Text (Convert)** button.
    - ❌ Beside or inside **Copy Text**, **Download .txt**, or **Clear** buttons.
- [x] **Visual Distinction**:
  - All ad slots must have a clear uppercase label: `ADVERTISEMENT • [PLACEMENT NAME]`.
  - Contained in distinct dashed borders with subtle background shading (`bg-slate-50/90`).
- [x] **No Real Publisher IDs in Version Control**:
  - Safe placeholder mode in development and testing.
  - Production publisher IDs (`ca-pub-xxxxxxxxxx`) must be injected exclusively via runtime environment variables (`NEXT_PUBLIC_ADSENSE_CLIENT_ID`), never committed to git.

---

## 4. Privacy, Legal & Cookie Compliance

- [x] **Zero-Retention Guarantee**:
  - Uploaded files are assigned random UUID v4 hashes in `/tmp/ocr_uploads/`.
  - Immediate file destruction upon completion via Python `try...finally` context managers.
  - Automated Celery Beat task sweeps orphaned files older than 24 hours every 900 seconds.
  - Extracted text is never stored in databases, logged in server logs, or used to train machine learning models.
- [x] **Dedicated Legal Routes**:
  - `/privacy`: Full GDPR & CCPA/CPRA rights disclosure, data processor disclosures (Stripe, Google OAuth), zero-retention architecture.
  - `/terms`: Clear acceptable use policy, recurring subscription billing terms ($19/mo), self-service cancellation via Stripe Customer Portal, disclaimer of warranties.
  - `/cookies`: Categorization into Essential, Functional, and Sponsor cookies with user opt-out instructions.
  - `/about`: Project mission, ethical data pledge, and open-source foundations.
  - `/contact`: Direct user support, bug reporting, and enterprise inquiries.
- [x] **Configurable Cookie Consent Banner**:
  - Floating bottom banner present across all routes via `RootLayout`.
  - Allows "Accept All", "Essential Only", and granular preference customization.
  - Persists consent state in `localStorage` (`scantext_cookie_consent`).

---

## 5. Technical SEO & Crawlability Verification

- [x] **Dynamic Sitemap**: `frontend/src/app/sitemap.ts` generates `/sitemap.xml` covering all 13 canonical public routes with appropriate `priority` and `changeFrequency`.
- [x] **Robots Configuration**: `frontend/src/app/robots.ts` generates `/robots.txt` allowing public routes while strictly disallowing private administrative dashboards (`/admin/`, `/dashboard/`, `/api/`, `/login`, `/register`).
- [x] **Canonical URLs**: `alternates: { canonical: '...' }` defined across all static guide and legal pages to eliminate duplicate content penalties.
- [x] **Structured Data (Schema.org JSON-LD)**:
  - `HowTo` schema on guide pages (`/how-to-extract-text-from-image`, etc.).
  - `WebApplication` schema on converter pages (`/jpg-to-text`, `/png-to-text`, `/pdf-to-text`, `/screenshot-to-text`).
  - `Article` schema on `/how-to-improve-ocr-accuracy`.
- [x] **Global Navigation & Footer Integration**:
  - `Header.tsx`: "Guides & Tools" dropdown listing all 6 formats, plus Pricing, About, and Contact.
  - `Footer.tsx`: 4-column structured footer linking all legal, guide, and company pages on every screen.
