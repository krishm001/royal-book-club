# Epic: Catalog Experience Optimization Spec

## 1. Vision & Goals
The Catalog Experience epic focuses on empowering curators (admins) with professional-grade tools for managing the physical book inventory. This includes intelligent identification of scanned copies in the ingestion console and advanced image capture capabilities that rival dedicated document scanning applications.

---

## 2. Scope & Requirements

### 2.1 Copy Highlighting on Scan in Book Ingestion Console

#### Current Behavior
When an admin scans a book via NFC or QR code in the **Book Ingestion Console** (`/admin/books`):
1. The system resolves the book from the catalog.
2. The book form is populated with existing metadata.
3. The copy registry section shows all copies with their `copyNo`, `ntagUid`, and `qrId`.

**Problem**: There is no visual indication of *which specific copy* was scanned. If a physical book has a damaged or missing QR/NFC tag, the admin needs to know which exact copy corresponds to the physical volume they are holding — so they can re-associate or update the correct tag.

#### Required Behavior
1. When a book is found via NFC scan, the system must identify which copy's `ntagUid` matches the scanned serial number.
2. When a book is found via QR code scan, the system must identify which copy's `qrId` matches the scanned QR ID.
3. The matching copy card in the Copy Registry section must be **visually highlighted** with:
   - A prominent border glow (accent/gold color, pulsing animation).
   - A "Scanned Copy" badge/chip displayed on the highlighted copy card.
   - Auto-scroll to bring the highlighted copy into view if it's not currently visible.
4. The highlight must persist until:
   - The admin performs another scan.
   - The admin manually dismisses the highlight.
   - The form is reset or a new book is loaded.
5. If the scanned tag/QR does not match any existing copy (tag is unassigned), display a notification: *"This tag/QR is not currently assigned to any copy of this book. You can assign it to a copy below."*

#### Technical Implementation Notes
- The scan result in `handleScanResult` / `handleNfcScanResult` already has access to the scanned data (NFC serial or QR ID).
- Parse the scanned data to extract the identifier:
  - **NFC**: Serial number from `NDEFReader` event.
  - **QR**: Parse `qr=(\d+)` from URL or direct numeric ID.
- Compare against `copies[].ntagUid` and `copies[].qrId` to find the matching `copyNo`.
- Store `highlightedCopyNo` in component state.
- Apply CSS class `.copy-card-highlighted` to the matching copy card.

---

### 2.2 Enhanced Image Capture & Processing for Book Covers

#### Current Behavior
The Book Ingestion Console provides basic image capture:
1. **Camera snap**: Opens device camera via `getUserMedia`, displays video stream, user clicks "Snap Cover Photo" to capture.
2. **File upload**: Standard file input accepting `image/jpeg`, `image/png`, `image/webp`.
3. **Fit/Fill modes**: Fit captures full sensor; Fill crops to 3:4 portrait.
4. **Multi-sensor switching**: Can toggle between Ultra-wide, Main, and Rear sensors.
5. **Digital zoom**: 0.5x to 3.0x slider.

**Problem**: The captured images suffer from:
- **Glare/shine** from glossy book covers under lighting.
- **Perspective distortion** when camera is not perfectly perpendicular.
- **Poor framing** — no intelligent detection of book cover boundaries.
- **No post-capture enhancement** — existing images cannot be improved.

#### Required Behavior

##### 2.2.1 Smart Document Detection & Auto-Crop
Implement intelligent book cover detection during camera capture:
1. **Real-time edge detection overlay**: While the camera viewfinder is active, overlay a detected document boundary (green/accent-colored quadrilateral) on the video feed.
2. **Auto-crop on capture**: When the user snaps the photo, automatically crop to the detected document boundaries.
3. **Perspective correction**: Apply a 4-point perspective transform to de-skew the cropped image into a perfect rectangle.
4. **Manual corner adjustment**: After auto-detection, allow the user to drag the four corner handles to fine-tune the crop region before confirming.

##### 2.2.2 Glare & Shine Removal
Apply post-processing to reduce or eliminate glare from glossy covers:
1. **Adaptive histogram equalization**: Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to normalize lighting across the image.
2. **Specular highlight reduction**: Detect and soften bright specular highlights that indicate glare spots.
3. **Shadow normalization**: Even out shadows around book edges.

##### 2.2.3 Image Enhancement Pipeline
Provide a suite of enhancement controls accessible both during capture and for existing images:
1. **Auto-enhance button**: One-click enhancement that applies:
   - Brightness/contrast auto-adjustment.
   - Sharpening (unsharp mask).
   - Color vibrancy boost.
   - Noise reduction.
2. **Manual controls** (slider-based):
   - Brightness (-100 to +100)
   - Contrast (-100 to +100)
   - Sharpness (0 to 100)
   - Saturation (-100 to +100)
3. **Before/After toggle**: Allow curators to compare original vs enhanced image with a swipe slider or toggle button.

##### 2.2.4 Enhance Existing Images
For books already in the catalog with existing cover images:
1. Add an **"Enhance"** button on the cover image preview in the Cover Images step (Step 2).
2. Clicking "Enhance" loads the existing image into the enhancement pipeline.
3. All enhancement controls (auto-enhance, manual sliders, before/after) are available.
4. The enhanced image can be saved (uploaded to Firebase Storage, replacing the URL in the book record).
5. A "Revert to Original" option preserves the original URL until the curator explicitly saves.

##### 2.2.5 Technology Approach
Given the project is a **client-side React SPA** without heavy backend image processing:
- Use **Canvas API** for all image manipulation (brightness, contrast, sharpen, crop, perspective transform).
- Use **OpenCV.js** (WebAssembly build) for:
  - Document edge detection (Canny + contour finding + convex hull approximation).
  - Perspective transformation (4-point warp).
  - CLAHE histogram equalization.
- Use CSS `filter` properties for real-time preview of brightness/contrast/saturation adjustments.
- Final processing applies Canvas pixel manipulation for production-quality output.
- All processing happens **entirely client-side** — no server-side image processing required.

---

## 3. Implementation Phases

### Phase 1: Copy Highlighting on Admin Scan (Priority: High)
- Parse scanned NFC/QR data to identify matching copy.
- Add `highlightedCopyNo` state to `BookIngestionConsole.jsx`.
- Apply highlight CSS animation and "Scanned Copy" badge.
- Auto-scroll to highlighted copy.
- Handle unmatched tag notification.

### Phase 2: Enhanced Image Capture (Priority: Medium-High)
- Integrate OpenCV.js (WASM) for edge detection.
- Build document boundary detection overlay on camera viewfinder.
- Implement auto-crop + perspective correction on capture.
- Add manual 4-corner adjustment UI.

### Phase 3: Image Enhancement Pipeline (Priority: Medium)
- Build enhancement controls component (auto-enhance + manual sliders).
- Implement Canvas-based image processing (brightness, contrast, sharpen, saturation, denoise).
- Add before/after comparison UI.
- Wire up "Enhance" button for existing catalog images.
- Implement glare/shine reduction via CLAHE.

---

## 4. Acceptance Criteria

### AC-1: Copy Highlighting
- [ ] Scanning a book via NFC in ingestion console highlights the matching copy card.
- [ ] Scanning a book via QR code in ingestion console highlights the matching copy card.
- [ ] Highlighted copy shows a pulsing accent border and "Scanned Copy" badge.
- [ ] Copy registry auto-scrolls to show the highlighted copy.
- [ ] If scanned tag/QR doesn't match any copy, a notification message is shown.
- [ ] Highlight persists until next scan, manual dismiss, or form reset.

### AC-2: Enhanced Image Capture
- [ ] Camera viewfinder shows real-time document boundary overlay.
- [ ] Captured image is auto-cropped to detected boundaries.
- [ ] Perspective correction straightens skewed captures.
- [ ] Manual 4-corner drag handles allow fine-tuning before confirm.
- [ ] OpenCV.js loads without blocking the main thread.

### AC-3: Image Enhancement
- [ ] Auto-enhance button applies brightness, contrast, sharpen, and color corrections.
- [ ] Manual sliders for brightness, contrast, sharpness, saturation work in real-time preview.
- [ ] Before/after comparison is available.
- [ ] Existing catalog images can be loaded into the enhancement pipeline.
- [ ] Enhanced images are uploaded to Firebase Storage correctly.
- [ ] "Revert to Original" preserves the original image URL.
