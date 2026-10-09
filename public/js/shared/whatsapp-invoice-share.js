
/* ============================================================
   OM MARUTI DIAMOND
   WHATSAPP INVOICE PDF SHARING
   SELL + BUY
   ============================================================ */

let sharingInProgress = false;

/* ============================================================
   1. SAFE FILE NAME
   ============================================================ */

function safeFilenamePart(value) {
    return String(value || "INVOICE")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 80);
}

/* ============================================================
   2. DOWNLOAD PDF
   ============================================================ */

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 60000);
}

/* ============================================================
   3. WAIT FOR IMAGES
   ============================================================ */

async function waitForImages(element) {
    const images = Array.from(
        element.querySelectorAll("img")
    );

    await Promise.all(
        images.map(async (img) => {
            if (!img.complete) {
                await new Promise((resolve) => {
                    img.addEventListener(
                        "load",
                        resolve,
                        { once: true }
                    );

                    img.addEventListener(
                        "error",
                        resolve,
                        { once: true }
                    );
                });
            }

            if (
                img.complete &&
                img.naturalWidth > 0 &&
                typeof img.decode === "function"
            ) {
                await img.decode().catch(() => {});
            }
        })
    );
}

/* ============================================================
   4. WAIT FOR FONTS
   ============================================================ */

async function waitForFonts() {
    if (document.fonts?.ready) {
        await document.fonts.ready;
    }
}

/* ============================================================
   5. CREATE PDF
   ============================================================ */

async function createInvoicePdf(invoiceElement) {
    if (typeof window.html2pdf !== "function") {
        throw new Error(
            "PDF library is not loaded. Check html2pdf.js."
        );
    }

    if (!invoiceElement) {
        throw new Error(
            "Invoice element was not found."
        );
    }

    /*
     * Clone the invoice so the actual preview
     * is never permanently modified.
     */

    const clone = invoiceElement.cloneNode(true);

    clone.id = "invoicePage";
    clone.classList.add("omd-pdf-export");

    /*
     * IMPORTANT:
     * Do not position the stage at left:-10000px.
     * That can cause cropped html2canvas captures.
     */

    const stage = document.createElement("div");

    stage.id = "omdPdfRenderStage";

    stage.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "width:794px",
        "height:auto",
        "margin:0",
        "padding:0",
        "background:#ffffff",
        "pointer-events:none",
        "z-index:2147483647",
        "opacity:1",
        "overflow:visible"
    ].join(";");

    stage.appendChild(clone);
    document.body.appendChild(stage);

    try {
        await waitForFonts();
        await waitForImages(clone);

        /*
         * Give the browser a chance to calculate
         * the clone's final layout.
         */

        await new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });

        const pdfOptions = {
            margin: 0,

            image: {
                type: "jpeg",
                quality: 0.98
            },

            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",

                scrollX: 0,
                scrollY: 0,

                windowWidth: Math.max(
                    794,
                    document.documentElement.clientWidth
                ),

                logging: false
            },

            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait",
                compress: true
            },

            pagebreak: {
                mode: ["css", "legacy"]
            }
        };

        const blob = await window.html2pdf()
            .set(pdfOptions)
            .from(clone)
            .outputPdf("blob");

        if (
            !(blob instanceof Blob) ||
            blob.size === 0
        ) {
            throw new Error(
                "PDF generation returned an empty file."
            );
        }

        return blob;

    } finally {
        stage.remove();
    }
}

/* ============================================================
   6. WHATSAPP URL
   ============================================================ */

function createWhatsAppUrl(message) {
    return (
        "https://api.whatsapp.com/send?text=" +
        encodeURIComponent(message)
    );
}

/* ============================================================
   7. SHARE INVOICE
   ============================================================ */

export async function shareInvoicePdf({
    invoiceElement,
    invoiceNumber,
    invoiceType,
    button
}) {
    if (sharingInProgress) {
        return;
    }

    if (!invoiceElement) {
        throw new Error(
            "Invoice content is missing."
        );
    }

    const publicNumber = String(
        invoiceNumber || ""
    ).trim();

    if (!publicNumber) {
        throw new Error(
            "Invoice number is missing."
        );
    }

    sharingInProgress = true;

    const previousText = button?.textContent;

    if (button) {
        button.disabled = true;
        button.textContent = "Preparing PDF...";
    }

    try {
        /*
         * Public number is already OMD-S-0001
         * or OMD-B-0001. Do not add OMD again.
         */

        const filename =
            `${safeFilenamePart(publicNumber)}.pdf`;

        console.log(
            "[OMD PDF] Generating:",
            filename
        );

        const blob = await createInvoicePdf(
            invoiceElement
        );

        const file = new File(
            [blob],
            filename,
            {
                type: "application/pdf",
                lastModified: Date.now()
            }
        );

        /*
         * Mobile:
         * Attempt to share the actual PDF.
         *
         * Some browsers require navigator.share()
         * to run immediately after the user click.
         * Because PDF generation is asynchronous,
         * native sharing may fail even when supported.
         */

        if (
            typeof navigator.share === "function" &&
            typeof navigator.canShare === "function" &&
            navigator.canShare({
                files: [file]
            })
        ) {
            try {
                await navigator.share({
                    files: [file]
                });

                console.log(
                    "[OMD PDF] Native share completed."
                );

                return;

            } catch (error) {
                if (error?.name === "AbortError") {
                    console.log(
                        "[OMD PDF] Share cancelled."
                    );
                    return;
                }

                console.warn(
                    "[OMD PDF] Native sharing unavailable:",
                    error
                );
            }
        }

        /*
         * Desktop / unsupported browser:
         * Download PDF first.
         */

        downloadBlob(blob, filename);

        const typeLabel =
            String(invoiceType || "INVOICE")
                .trim()
                .toUpperCase();

        const message = [
            "OM MARUTI DIAMOND",
            `${typeLabel} Invoice: ${publicNumber}`,
            "",
            "Please find the invoice PDF attached."
        ].join("\n");

        const whatsappUrl =
            createWhatsAppUrl(message);

        /*
         * Opening a new tab after PDF generation
         * can be blocked by popup blockers.
         *
         * Therefore, the fallback uses an explicit
         * user click in the confirmation dialog.
         */

        const openWhatsapp = window.confirm(
            "Your invoice PDF has been downloaded.\n\n" +
            "Open WhatsApp now?\n\n" +
            "IMPORTANT: Attach the downloaded PDF " +
            "manually before sending."
        );

        if (openWhatsapp) {
            window.location.assign(
                whatsappUrl
            );
        }

        console.log(
            "[OMD PDF] Desktop fallback completed."
        );

    } finally {
        sharingInProgress = false;

        if (button) {
            button.disabled = false;
            button.textContent = previousText;
        }
    }
}
