/* ============================================================
   OM MARUTI DIAMOND
   PURCHASE INVOICE
   ------------------------------------------------------------
   Read-only printable Buy invoice.

   SECURITY:
   - Firebase Auth required
   - Firestore READ only
   - No financial writes
   - Historical supplier/business snapshots preferred
   - All DOM values written with textContent
   ============================================================ */

import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    shareInvoicePdf
} from "../shared/whatsapp-invoice-share.js";

import {
    auth,
    db
} from "../firebase.js";


/* ============================================================
   CONFIG
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";

const DEFAULT_BUSINESS_NAME =
    "OM MARUTI DIAMOND";

const DEFAULT_LOGO_URL =
    "https://i.ibb.co/Tq73qTts/om-maruti-logo.png";


/* ============================================================
   STATE
   ============================================================ */

const state = {
    authenticated: false,

    purchaseId: "",
    purchase: null,

    unsubscribePurchase: null
};


/* ============================================================
   DOM
   ============================================================ */

const elements = {

    /* TOOLBAR */

    backButton:
        document.getElementById(
            "backButton"
        ),

    printButton:
        document.getElementById(
            "printButton"
        ),

    toolbarInvoiceNumber:
        document.getElementById(
            "toolbarInvoiceNumber"
        ),
    

    shareInvoiceWhatsappButton:
        document.getElementById(
            "shareInvoiceWhatsappButton"
        ),

    /* PAGE STATES */

    invoiceLoadingState:
        document.getElementById(
            "invoiceLoadingState"
        ),

    invoiceErrorState:
        document.getElementById(
            "invoiceErrorState"
        ),

    invoiceErrorTitle:
        document.getElementById(
            "invoiceErrorTitle"
        ),

    invoiceErrorMessage:
        document.getElementById(
            "invoiceErrorMessage"
        ),

    errorBackButton:
        document.getElementById(
            "errorBackButton"
        ),

    invoiceContent:
        document.getElementById(
            "invoiceContent"
        ),


    /* BUSINESS */

    invoiceBusinessName:
        document.getElementById(
            "invoiceBusinessName"
        ),

    invoiceBusinessAddress:
        document.getElementById(
            "invoiceBusinessAddress"
        ),

    invoiceBusinessMobile:
        document.getElementById(
            "invoiceBusinessMobile"
        ),

    invoiceBusinessEmail:
        document.getElementById(
            "invoiceBusinessEmail"
        ),

    invoiceBusinessGstinRow:
        document.getElementById(
            "invoiceBusinessGstinRow"
        ),

    invoiceBusinessGstin:
        document.getElementById(
            "invoiceBusinessGstin"
        ),

    invoiceBusinessLogo:
        document.getElementById(
            "invoiceBusinessLogo"
        ),

    invoiceLogoPlaceholder:
        document.getElementById(
            "invoiceLogoPlaceholder"
        ),


    /* SUPPLIER */

    invoiceSupplierName:
        document.getElementById(
            "invoiceSupplierName"
        ),

    invoiceSupplierAddress:
        document.getElementById(
            "invoiceSupplierAddress"
        ),

    invoiceSupplierMobileRow:
        document.getElementById(
            "invoiceSupplierMobileRow"
        ),

    invoiceSupplierMobile:
        document.getElementById(
            "invoiceSupplierMobile"
        ),

    invoiceSupplierEmailRow:
        document.getElementById(
            "invoiceSupplierEmailRow"
        ),

    invoiceSupplierEmail:
        document.getElementById(
            "invoiceSupplierEmail"
        ),

    invoiceSupplierGstinRow:
        document.getElementById(
            "invoiceSupplierGstinRow"
        ),

    invoiceSupplierGstin:
        document.getElementById(
            "invoiceSupplierGstin"
        ),


    /* PURCHASE META */

    invoicePurchaseNumber:
        document.getElementById(
            "invoicePurchaseNumber"
        ),

    invoiceSupplierInvoiceNumberRow:
        document.getElementById(
            "invoiceSupplierInvoiceNumberRow"
        ),

    invoiceSupplierInvoiceNumber:
        document.getElementById(
            "invoiceSupplierInvoiceNumber"
        ),

    invoicePurchaseDate:
        document.getElementById(
            "invoicePurchaseDate"
        ),

    invoicePurchaseType:
        document.getElementById(
            "invoicePurchaseType"
        ),

    invoiceDueDateRow:
        document.getElementById(
            "invoiceDueDateRow"
        ),

    invoiceDueDate:
        document.getElementById(
            "invoiceDueDate"
        ),

    invoiceBrokerRow:
        document.getElementById(
            "invoiceBrokerRow"
        ),

    invoiceBroker:
        document.getElementById(
            "invoiceBroker"
        ),


    /* ITEMS */

    invoiceItemsBody:
        document.getElementById(
            "invoiceItemsBody"
        ),

    invoiceTotalPieces:
        document.getElementById(
            "invoiceTotalPieces"
        ),

    invoiceTotalCarat:
        document.getElementById(
            "invoiceTotalCarat"
        ),

    invoiceSubtotalTable:
        document.getElementById(
            "invoiceSubtotalTable"
        ),

    invoiceTaxTable:
        document.getElementById(
            "invoiceTaxTable"
        ),

    invoiceLineTotalTable:
        document.getElementById(
            "invoiceLineTotalTable"
        ),


    /* WORDS / NOTES */

    invoiceAmountWords:
        document.getElementById(
            "invoiceAmountWords"
        ),

    invoiceNotesSection:
        document.getElementById(
            "invoiceNotesSection"
        ),

    invoiceNotes:
        document.getElementById(
            "invoiceNotes"
        ),

    invoiceDeclarationSection:
        document.getElementById(
            "invoiceDeclarationSection"
        ),

    invoiceDeclaration:
        document.getElementById(
            "invoiceDeclaration"
        ),


    /* TOTALS */

    invoiceSubtotal:
        document.getElementById(
            "invoiceSubtotal"
        ),

    invoiceDiscountRow:
        document.getElementById(
            "invoiceDiscountRow"
        ),

    invoiceDiscount:
        document.getElementById(
            "invoiceDiscount"
        ),

    invoiceTax:
        document.getElementById(
            "invoiceTax"
        ),

    invoiceChargesRow:
        document.getElementById(
            "invoiceChargesRow"
        ),

    invoiceCharges:
        document.getElementById(
            "invoiceCharges"
        ),

    invoiceRoundOffRow:
        document.getElementById(
            "invoiceRoundOffRow"
        ),

    invoiceRoundOff:
        document.getElementById(
            "invoiceRoundOff"
        ),

    invoiceGrandTotal:
        document.getElementById(
            "invoiceGrandTotal"
        ),

    invoicePaid:
        document.getElementById(
            "invoicePaid"
        ),

    invoiceBalance:
        document.getElementById(
            "invoiceBalance"
        ),


    /* SIGNATURES */

    invoiceSupplierSignatureName:
        document.getElementById(
            "invoiceSupplierSignatureName"
        ),

    invoiceBusinessSignature:
        document.getElementById(
            "invoiceBusinessSignature"
        )
};


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function text(value) {
    return String(
        value ?? ""
    );
}


function cleanText(value) {
    return text(value)
        .trim();
}


function safePaise(value) {
    return Number.isSafeInteger(
        value
    )
        ? value
        : 0;
}


function safeNumber(value) {
    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* ============================================================
   PURCHASE PUBLIC NUMBER
   ============================================================ */

function readPurchaseNumber() {
    const pathname =
        decodeURIComponent(
            window.location.pathname
        );

    const parts =
        pathname
            .split("/")
            .filter(Boolean);

    if (
        parts.length === 2 &&
        parts[0].toLowerCase() ===
            "purchase-invoices"
    ) {
        return cleanText(
            parts[1]
        ).toUpperCase();
    }

    return "";
}


async function resolvePurchaseIdByNumber(
    purchaseNumber
) {
    const cleanedPurchaseNumber =
        cleanText(
            purchaseNumber
        ).toUpperCase();

    if (
        !cleanedPurchaseNumber
    ) {
        return "";
    }

    const purchasesRef =
        collection(
            db,
            "businesses",
            BUSINESS_ID,
            "purchases"
        );

    const purchaseQuery =
        query(
            purchasesRef,

            where(
                "purchaseNumber",
                "==",
                cleanedPurchaseNumber
            ),

            limit(1)
        );

    const snapshot =
        await getDocs(
            purchaseQuery
        );

    if (
        snapshot.empty
    ) {
        return "";
    }

    return snapshot.docs[0].id;
}


/* ============================================================
   FIRESTORE REFERENCE
   ============================================================ */

function purchaseDocument(
    purchaseId
) {
    return doc(
        db,
        "businesses",
        BUSINESS_ID,
        "purchases",
        purchaseId
    );
}


/* ============================================================
   MONEY
   ============================================================ */

function formatMoney(paise) {
    const amount =
        Number.isFinite(
            Number(paise)
        )
            ? Number(paise)
            : 0;

    return new Intl.NumberFormat(
        "en-IN",
        {
            style:
                "currency",

            currency:
                "INR",

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    ).format(
        amount / 100
    );
}


/* ============================================================
   SIGNED MONEY
   ============================================================ */

function formatSignedMoney(
    paise
) {
    const amount =
        Number.isSafeInteger(
            paise
        )
            ? paise
            : 0;

    if (amount < 0) {
        return `− ${formatMoney(
            Math.abs(amount)
        )}`;
    }

    return formatMoney(
        amount
    );
}


/* ============================================================
   DATE
   ============================================================ */

function timestampToDate(
    value
) {
    if (!value) {
        return null;
    }

    if (
        typeof value.toDate ===
        "function"
    ) {
        return value.toDate();
    }

    if (
        value instanceof Date
    ) {
        return value;
    }

    if (
        typeof value ===
        "string"
    ) {
        const dateOnlyMatch =
            value.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

        if (dateOnlyMatch) {
            return new Date(
                Number(
                    dateOnlyMatch[1]
                ),
                Number(
                    dateOnlyMatch[2]
                ) - 1,
                Number(
                    dateOnlyMatch[3]
                )
            );
        }

        const parsed =
            new Date(value);

        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {
            return parsed;
        }

        return null;
    }

    if (
        typeof value ===
        "number"
    ) {
        const parsed =
            new Date(value);

        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {
            return parsed;
        }
    }

    return null;
}


function formatDate(value) {
    const date =
        timestampToDate(
            value
        );

    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    ).format(date);
}


/* ============================================================
   AMOUNT IN WORDS
   ============================================================ */

function belowThousandToWords(
    number
) {
    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen"
    ];

    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety"
    ];

    let value =
        Math.floor(
            number
        );

    const words = [];

    if (value >= 100) {
        words.push(
            ones[
                Math.floor(
                    value / 100
                )
            ],
            "Hundred"
        );

        value %= 100;
    }

    if (value >= 20) {
        words.push(
            tens[
                Math.floor(
                    value / 10
                )
            ]
        );

        value %= 10;
    }

    if (
        value > 0 &&
        value < 20
    ) {
        words.push(
            ones[value]
        );
    }

    return words.join(" ");
}


function integerToIndianWords(
    number
) {
    let value =
        Math.floor(
            Math.abs(
                number
            )
        );

    if (value === 0) {
        return "Zero";
    }

    const parts = [];

    const crore =
        Math.floor(
            value / 10000000
        );

    if (crore) {
        parts.push(
            integerToIndianWords(
                crore
            ),
            "Crore"
        );

        value %=
            10000000;
    }

    const lakh =
        Math.floor(
            value / 100000
        );

    if (lakh) {
        parts.push(
            belowThousandToWords(
                lakh
            ),
            "Lakh"
        );

        value %=
            100000;
    }

    const thousand =
        Math.floor(
            value / 1000
        );

    if (thousand) {
        parts.push(
            belowThousandToWords(
                thousand
            ),
            "Thousand"
        );

        value %=
            1000;
    }

    if (value) {
        parts.push(
            belowThousandToWords(
                value
            )
        );
    }

    return parts
        .filter(Boolean)
        .join(" ");
}


function amountToWords(
    paise
) {
    const safe =
        Math.max(
            0,
            Math.round(
                Number(paise) ||
                0
            )
        );

    const rupees =
        Math.floor(
            safe / 100
        );

    const paisePart =
        safe % 100;

    let result =
        `${integerToIndianWords(
            rupees
        )} Rupees`;

    if (paisePart) {
        result +=
            ` and ${integerToIndianWords(
                paisePart
            )} Paise`;
    }

    return `${result} Only`;
}


/* ============================================================
   SNAPSHOT HELPERS
   ============================================================ */

function firstObject(
    ...values
) {
    for (
        const value of values
    ) {
        if (
            value &&
            typeof value ===
                "object" &&
            !Array.isArray(value)
        ) {
            return value;
        }
    }

    return {};
}


/* ============================================================
   SUPPLIER SNAPSHOT

   Historical snapshot is intentionally preferred.
   ============================================================ */

function getSupplierSnapshot(
    purchase
) {
    const snapshot =
        firstObject(
            purchase
                .supplierSnapshot,

            purchase.supplier,

            purchase
                .vendorSnapshot
        );

    return {
        name:
            cleanText(
                snapshot.name ||
                snapshot.businessName ||
                snapshot.companyName
            ) ||
            "Supplier",

        address:
            cleanText(
                snapshot.address ||
                snapshot.fullAddress
            ),

        mobile:
            cleanText(
                snapshot.mobile ||
                snapshot.phone
            ),

        email:
            cleanText(
                snapshot.email
            ),

        gstin:
            cleanText(
                snapshot.gstin ||
                snapshot.gstNumber
            )
    };
}


/* ============================================================
   BUSINESS SNAPSHOT

   Historical purchase snapshot is preferred so an old invoice
   does not silently change when Profile data changes later.
   ============================================================ */

function getBusinessSnapshot(
    purchase
) {
    const snapshot =
        firstObject(
            purchase
                .businessSnapshot,

            purchase
                .sellerSnapshot,

            purchase.business
        );

    return {
        name:
            cleanText(
                snapshot.name ||
                snapshot.businessName ||
                snapshot.companyName
            ) ||
            DEFAULT_BUSINESS_NAME,

        address:
            cleanText(
                snapshot.address ||
                snapshot.fullAddress
            ),

        mobile:
            cleanText(
                snapshot.mobile ||
                snapshot.phone
            ),

        email:
            cleanText(
                snapshot.email
            ),

        gstin:
            cleanText(
                snapshot.gstin ||
                snapshot.gstNumber
            ),

        logoUrl:
            cleanText(
                snapshot.logoUrl ||
                snapshot.logo
            ) ||
            DEFAULT_LOGO_URL
    };
}


/* ============================================================
   CONDITIONAL FIELD
   ============================================================ */

function renderOptionalRow(
    row,
    target,
    value
) {
    if (
        !row ||
        !target
    ) {
        return;
    }

    const cleaned =
        cleanText(value);

    if (!cleaned) {
        row.hidden =
            true;

        target.textContent =
            "";

        return;
    }

    target.textContent =
        cleaned;

    row.hidden =
        false;
}


/* ============================================================
   BUSINESS
   ============================================================ */

function renderBusiness(
    purchase
) {
    const business =
        getBusinessSnapshot(
            purchase
        );

    if (
        elements.invoiceBusinessName
    ) {
        elements.invoiceBusinessName
            .textContent =
            business.name;
    }

    if (
        elements.invoiceBusinessAddress
    ) {
        elements.invoiceBusinessAddress
            .textContent =
            business.address ||
            "";
    }

    if (
        elements.invoiceBusinessMobile
    ) {
        elements.invoiceBusinessMobile
            .textContent =
            business.mobile ||
            "";
    }

    if (
        elements.invoiceBusinessEmail
    ) {
        elements.invoiceBusinessEmail
            .textContent =
            business.email ||
            "";
    }

    renderOptionalRow(
        elements
            .invoiceBusinessGstinRow,

        elements
            .invoiceBusinessGstin,

        business.gstin
    );

    if (
        elements.invoiceBusinessSignature
    ) {
        elements.invoiceBusinessSignature
            .textContent =
            business.name;
    }

    renderLogo(
        business.logoUrl
    );
}


/* ============================================================
   LOGO
   ============================================================ */

function showLogoPlaceholder() {
    if (
        elements.invoiceBusinessLogo
    ) {
        elements.invoiceBusinessLogo
            .hidden =
            true;
    }

    if (
        elements.invoiceLogoPlaceholder
    ) {
        elements.invoiceLogoPlaceholder
            .hidden =
            false;
    }
}


function showLogoImage() {
    if (
        elements.invoiceBusinessLogo
    ) {
        elements.invoiceBusinessLogo
            .hidden =
            false;
    }

    if (
        elements.invoiceLogoPlaceholder
    ) {
        elements.invoiceLogoPlaceholder
            .hidden =
            true;
    }
}


function renderLogo(
    logoUrl
) {
    const image =
        elements.invoiceBusinessLogo;

    if (!image) {
        return;
    }

    const source =
        cleanText(
            logoUrl
        ) ||
        DEFAULT_LOGO_URL;

    image.onload =
        () => {
            showLogoImage();
        };

    image.onerror =
        () => {
            /*
             * If a custom historical URL fails,
             * try the standard OM MARUTI logo once.
             */

            if (
                image.src !==
                DEFAULT_LOGO_URL
            ) {
                image.src =
                    DEFAULT_LOGO_URL;

                return;
            }

            showLogoPlaceholder();
        };

    image.src =
        source;
}


/* ============================================================
   SUPPLIER
   ============================================================ */

function renderSupplier(
    purchase
) {
    const supplier =
        getSupplierSnapshot(
            purchase
        );

    if (
        elements.invoiceSupplierName
    ) {
        elements.invoiceSupplierName
            .textContent =
            supplier.name;
    }

    if (
        elements.invoiceSupplierAddress
    ) {
        elements.invoiceSupplierAddress
            .textContent =
            supplier.address ||
            "—";
    }

    renderOptionalRow(
        elements
            .invoiceSupplierMobileRow,

        elements
            .invoiceSupplierMobile,

        supplier.mobile
    );

    renderOptionalRow(
        elements
            .invoiceSupplierEmailRow,

        elements
            .invoiceSupplierEmail,

        supplier.email
    );

    renderOptionalRow(
        elements
            .invoiceSupplierGstinRow,

        elements
            .invoiceSupplierGstin,

        supplier.gstin
    );

    if (
        elements
            .invoiceSupplierSignatureName
    ) {
        elements
            .invoiceSupplierSignatureName
            .textContent =
            supplier.name;
    }
}


/* ============================================================
   PURCHASE METADATA
   ============================================================ */

function renderPurchaseMetadata(
    purchase
) {
    const purchaseNumber =
        cleanText(
            purchase.purchaseNumber
        ) ||
        "Purchase";

    if (
        elements
            .toolbarInvoiceNumber
    ) {
        elements
            .toolbarInvoiceNumber
            .textContent =
            purchaseNumber;
    }

    if (
        elements
            .invoicePurchaseNumber
    ) {
        elements
            .invoicePurchaseNumber
            .textContent =
            purchaseNumber;
    }


    /* SUPPLIER INVOICE */

    renderOptionalRow(
        elements
            .invoiceSupplierInvoiceNumberRow,

        elements
            .invoiceSupplierInvoiceNumber,

        purchase
            .supplierInvoiceNumber
    );


    /* PURCHASE DATE */

    if (
        elements
            .invoicePurchaseDate
    ) {
        elements
            .invoicePurchaseDate
            .textContent =
            formatDate(
                purchase.purchaseDate
            );
    }


    /* CASH / CREDIT */

    const purchaseType =
        cleanText(
            purchase.purchaseType
        ).toLowerCase();

    const isCredit =
        purchaseType ===
        "credit";

    if (
        elements
            .invoicePurchaseType
    ) {
        elements
            .invoicePurchaseType
            .textContent =
            isCredit
                ? "Credit Buy"
                : "Cash Buy";
    }


    /*
     * Due Date is displayed ONLY for Credit Buy.
     * It is read from the saved transaction.
     * Nothing is calculated automatically.
     */

    if (
        elements.invoiceDueDateRow
    ) {
        elements.invoiceDueDateRow
            .hidden =
            !isCredit;
    }

    if (
        elements.invoiceDueDate
    ) {
        elements.invoiceDueDate
            .textContent =
            isCredit
                ? formatDate(
                    purchase.dueDate
                )
                : "—";
    }


    /* BROKER */

    renderOptionalRow(
        elements.invoiceBrokerRow,
        elements.invoiceBroker,
        purchase.broker
    );
}


/* ============================================================
   ITEM HELPERS
   ============================================================ */

function getItemCarat(
    item
) {
    /*
     * Stored purchase documents currently keep the
     * normalized carat field for invoice display.
     */

    return Math.max(
        0,
        safeNumber(
            item.carat
        )
    );
}


function getItemPieces(
    item
) {
    return Math.max(
        0,
        Math.trunc(
            safeNumber(
                item.pieces
            )
        )
    );
}


function getItemTaxablePaise(
    item
) {
    if (
        Number.isSafeInteger(
            item.taxablePaise
        )
    ) {
        return item.taxablePaise;
    }

    if (
        Number.isSafeInteger(
            item.amountPaise
        )
    ) {
        return item.amountPaise;
    }

    return 0;
}


function getItemTaxPaise(
    item
) {
    return safePaise(
        item.taxPaise
    );
}


function getItemTotalPaise(
    item
) {
    if (
        Number.isSafeInteger(
            item.totalPaise
        )
    ) {
        return item.totalPaise;
    }

    return (
        getItemTaxablePaise(
            item
        ) +
        getItemTaxPaise(
            item
        )
    );
}


/* ============================================================
   TABLE CELL
   ============================================================ */

function createCell(
    value,
    className = ""
) {
    const cell =
        document.createElement(
            "td"
        );

    if (className) {
        cell.className =
            className;
    }

    cell.textContent =
        text(value);

    return cell;
}


/* ============================================================
   ITEMS
   ============================================================ */

function renderItems(
    purchase
) {
    const body =
        elements.invoiceItemsBody;

    if (!body) {
        return;
    }

    body.replaceChildren();

    const items =
        Array.isArray(
            purchase.items
        )
            ? purchase.items
            : [];

    let totalPieces = 0;
    let totalCarat = 0;

    let subtotalPaise = 0;
    let taxPaise = 0;
    let lineTotalPaise = 0;

    const fragment =
        document.createDocumentFragment();


    items.forEach(
        (item, index) => {
            const row =
                document.createElement(
                    "tr"
                );

            const pieces =
                getItemPieces(
                    item
                );

            const carat =
                getItemCarat(
                    item
                );

            const taxable =
                getItemTaxablePaise(
                    item
                );

            const tax =
                getItemTaxPaise(
                    item
                );

            const total =
                getItemTotalPaise(
                    item
                );

            totalPieces +=
                pieces;

            totalCarat +=
                carat;

            subtotalPaise +=
                taxable;

            taxPaise +=
                tax;

            lineTotalPaise +=
                total;


            row.appendChild(
                createCell(
                    index + 1
                )
            );


            row.appendChild(
                createCell(
                    cleanText(
                        item.material
                    ) ||
                    "—"
                )
            );


            row.appendChild(
                createCell(
                    cleanText(
                        item.description
                    ) ||
                    "—"
                )
            );


            row.appendChild(
                createCell(
                    cleanText(
                        item.remarks
                    ) ||
                    "—"
                )
            );


            row.appendChild(
                createCell(
                    cleanText(
                        item.hsn
                    ) ||
                    "—"
                )
            );


            row.appendChild(
                createCell(
                    pieces,
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    carat.toFixed(
                        3
                    ),
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    formatMoney(
                        safePaise(
                            item.ratePaise
                        )
                    ),
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    `${safeNumber(
                        item.discountPercent
                    ) || "0"}%`,
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    formatMoney(
                        taxable
                    ),
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    `${safeNumber(
                        item.taxPercent
                    ) || "0"}%`,
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    formatMoney(
                        tax
                    ),
                    "invoice-number"
                )
            );


            row.appendChild(
                createCell(
                    formatMoney(
                        total
                    ),
                    "invoice-number"
                )
            );


            fragment.appendChild(
                row
            );
        }
    );


    body.appendChild(
        fragment
    );


    if (
        elements.invoiceTotalPieces
    ) {
        elements.invoiceTotalPieces
            .textContent =
            String(
                totalPieces
            );
    }


    if (
        elements.invoiceTotalCarat
    ) {
        elements.invoiceTotalCarat
            .textContent =
            totalCarat.toFixed(
                3
            );
    }


    if (
        elements.invoiceSubtotalTable
    ) {
        elements.invoiceSubtotalTable
            .textContent =
            formatMoney(
                subtotalPaise
            );
    }


    if (
        elements.invoiceTaxTable
    ) {
        elements.invoiceTaxTable
            .textContent =
            formatMoney(
                taxPaise
            );
    }


    if (
        elements.invoiceLineTotalTable
    ) {
        elements.invoiceLineTotalTable
            .textContent =
            formatMoney(
                lineTotalPaise
            );
    }
}


/* ============================================================
   FINANCIALS
   ============================================================ */

function getFinancials(
    purchase
) {
    const grandTotalPaise =
        Math.max(
            0,
            safePaise(
                purchase
                    .grandTotalPaise
            )
        );

    const paidPaise =
        Math.max(
            0,
            Math.min(
                safePaise(
                    purchase
                        .paidPaise
                ),
                grandTotalPaise
            )
        );

    let balancePaise;

    if (
        Number.isSafeInteger(
            purchase.balancePaise
        )
    ) {
        balancePaise =
            Math.max(
                0,
                purchase.balancePaise
            );
    } else {
        balancePaise =
            Math.max(
                0,
                grandTotalPaise -
                paidPaise
            );
    }

    return {
        subtotalPaise:
            safePaise(
                purchase
                    .subtotalPaise
            ),

        taxPaise:
            safePaise(
                purchase.taxPaise
            ),

        discountPaise:
            safePaise(
                purchase
                    .discountPaise
            ),

        chargesPaise:
            safePaise(
                purchase
                    .chargesPaise
            ),

        roundOffPaise:
            safePaise(
                purchase
                    .roundOffPaise
            ),

        grandTotalPaise,

        paidPaise,

        balancePaise
    };
}


/* ============================================================
   TOTALS
   ============================================================ */

function renderTotals(
    purchase
) {
    const totals =
        getFinancials(
            purchase
        );


    if (
        elements.invoiceSubtotal
    ) {
        elements.invoiceSubtotal
            .textContent =
            formatMoney(
                totals
                    .subtotalPaise
            );
    }


    /* DISCOUNT */

    if (
        elements.invoiceDiscountRow
    ) {
        elements.invoiceDiscountRow
            .hidden =
            totals.discountPaise ===
            0;
    }

    if (
        elements.invoiceDiscount
    ) {
        elements.invoiceDiscount
            .textContent =
            totals.discountPaise
                ? `− ${formatMoney(
                    Math.abs(
                        totals
                            .discountPaise
                    )
                )}`
                : formatMoney(0);
    }


    /* TAX */

    if (
        elements.invoiceTax
    ) {
        elements.invoiceTax
            .textContent =
            formatMoney(
                totals.taxPaise
            );
    }


    /* CHARGES */

    if (
        elements.invoiceChargesRow
    ) {
        elements.invoiceChargesRow
            .hidden =
            totals.chargesPaise ===
            0;
    }

    if (
        elements.invoiceCharges
    ) {
        elements.invoiceCharges
            .textContent =
            formatMoney(
                totals
                    .chargesPaise
            );
    }


    /* ROUND OFF */

    if (
        elements.invoiceRoundOffRow
    ) {
        elements.invoiceRoundOffRow
            .hidden =
            totals.roundOffPaise ===
            0;
    }

    if (
        elements.invoiceRoundOff
    ) {
        elements.invoiceRoundOff
            .textContent =
            formatSignedMoney(
                totals
                    .roundOffPaise
            );
    }


    /* FINAL */

    if (
        elements.invoiceGrandTotal
    ) {
        elements.invoiceGrandTotal
            .textContent =
            formatMoney(
                totals
                    .grandTotalPaise
            );
    }


    /* PAID */

    if (
        elements.invoicePaid
    ) {
        elements.invoicePaid
            .textContent =
            formatMoney(
                totals.paidPaise
            );
    }


    /* PAYABLE */

    if (
        elements.invoiceBalance
    ) {
        elements.invoiceBalance
            .textContent =
            formatMoney(
                totals.balancePaise
            );
    }


    /* WORDS */

    if (
        elements.invoiceAmountWords
    ) {
        elements.invoiceAmountWords
            .textContent =
            amountToWords(
                totals
                    .grandTotalPaise
            );
    }
}


/* ============================================================
   NOTES + DECLARATION
   ============================================================ */

function renderNotes(
    purchase
) {
    const notes =
        cleanText(
            purchase.notes
        );

    const declaration =
        cleanText(
            purchase.declaration
        );


    if (
        elements.invoiceNotesSection
    ) {
        elements.invoiceNotesSection
            .hidden =
            !notes;
    }

    if (
        elements.invoiceNotes
    ) {
        elements.invoiceNotes
            .textContent =
            notes;
    }


    if (
        elements
            .invoiceDeclarationSection
    ) {
        elements
            .invoiceDeclarationSection
            .hidden =
            !declaration;
    }

    if (
        elements.invoiceDeclaration
    ) {
        elements.invoiceDeclaration
            .textContent =
            declaration;
    }
}


/* ============================================================
   MAIN RENDER
   ============================================================ */

function renderInvoice() {
    const purchase =
        state.purchase;

    if (!purchase) {
        return;
    }

    const purchaseNumber =
        cleanText(
            purchase.purchaseNumber
        ) ||
        "Purchase Invoice";


    document.title =
        `${purchaseNumber} | OM MARUTI DIAMOND`;


    renderBusiness(
        purchase
    );

    renderSupplier(
        purchase
    );

    renderPurchaseMetadata(
        purchase
    );

    renderItems(
        purchase
    );

    renderTotals(
        purchase
    );

    renderNotes(
        purchase
    );


    showInvoice();
}


/* ============================================================
   PAGE STATES
   ============================================================ */

function showLoading() {
    if (
        elements.invoiceLoadingState
    ) {
        elements.invoiceLoadingState
            .hidden =
            false;
    }

    if (
        elements.invoiceErrorState
    ) {
        elements.invoiceErrorState
            .hidden =
            true;
    }

    if (
        elements.invoiceContent
    ) {
        elements.invoiceContent
            .hidden =
            true;
    }

    if (
        elements.printButton
    ) {
        elements.printButton
            .disabled =
            true;
    }


    if (elements.shareInvoiceWhatsappButton) {
        elements.shareInvoiceWhatsappButton.disabled = true;
    }
}


function showInvoice() {
    if (
        elements.invoiceLoadingState
    ) {
        elements.invoiceLoadingState
            .hidden =
            true;
    }

    if (
        elements.invoiceErrorState
    ) {
        elements.invoiceErrorState
            .hidden =
            true;
    }

    if (
        elements.invoiceContent
    ) {
        elements.invoiceContent
            .hidden =
            false;
    }

    if (
        elements.printButton
    ) {
        elements.printButton
            .disabled =
            false;
    }


    if (elements.shareInvoiceWhatsappButton) {
        elements.shareInvoiceWhatsappButton.disabled = false;
    }
}


function showError(
    title,
    message
) {
    if (
        elements.invoiceLoadingState
    ) {
        elements.invoiceLoadingState
            .hidden =
            true;
    }

    if (
        elements.invoiceContent
    ) {
        elements.invoiceContent
            .hidden =
            true;
    }

    if (
        elements.invoiceErrorState
    ) {
        elements.invoiceErrorState
            .hidden =
            false;
    }

    if (
        elements.invoiceErrorTitle
    ) {
        elements.invoiceErrorTitle
            .textContent =
            title;
    }

    if (
        elements.invoiceErrorMessage
    ) {
        elements.invoiceErrorMessage
            .textContent =
            message;
    }

    if (
        elements.printButton
    ) {
        elements.printButton
            .disabled =
            true;
    }


    if (elements.shareInvoiceWhatsappButton) {
        elements.shareInvoiceWhatsappButton.disabled = true;
    }
}


/* ============================================================
   PURCHASE LISTENER
   ============================================================ */

function startPurchaseListener() {
    if (
        !state.purchaseId
    ) {
        showError(
            "Purchase ID missing",
            "Open the invoice from a saved Buy purchase."
        );

        return;
    }


    if (
        typeof state
            .unsubscribePurchase ===
        "function"
    ) {
        state.unsubscribePurchase();
    }


    const purchaseRef =
        purchaseDocument(
            state.purchaseId
        );


    state.unsubscribePurchase =
        onSnapshot(
            purchaseRef,

            (snapshot) => {
                if (
                    !snapshot.exists()
                ) {
                    state.purchase =
                        null;

                    showError(
                        "Purchase not found",
                        "The requested Buy purchase does not exist or is no longer available."
                    );

                    return;
                }


                state.purchase = {
                    id:
                        snapshot.id,

                    ...snapshot.data()
                };


                renderInvoice();
            },

            (error) => {
                console.error(
                    "Purchase invoice listener failed:",
                    error
                );

                showError(
                    "Unable to load purchase invoice",
                    "The purchase invoice could not be loaded. Please return to the Buy page and try again."
                );
            }
        );
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function handleBack() {
    const purchaseNumber =
        cleanText(
            state.purchase?.purchaseNumber
        ).toUpperCase();

    if (
        purchaseNumber
    ) {
        window.location.href =
            `/purchases/${encodeURIComponent(
                purchaseNumber
            )}`;

        return;
    }

    window.location.href =
        "/purchases";
}


/* ============================================================
   PRINT
   ============================================================ */

function handlePrint() {
    if (
        !state.purchase
    ) {
        return;
    }

    window.print();
}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {

    elements.backButton?.addEventListener(
        "click",
        handleBack
    );

    elements.errorBackButton?.addEventListener(
        "click",
        handleBack
    );

    elements.printButton?.addEventListener(
        "click",
        handlePrint
    );

    elements.shareInvoiceWhatsappButton
        ?.addEventListener(
            "click",
            async () => {

                if (!state.purchase) {
                    window.alert(
                        "Buy invoice is not ready."
                    );
                    return;
                }

                const button =
                    elements.shareInvoiceWhatsappButton;

                const invoiceElement =
                    document.getElementById(
                        "invoicePage"
                    );

                if (!invoiceElement) {
                    window.alert(
                        "Invoice page element was not found."
                    );
                    return;
                }

                try {

                    await shareInvoicePdf({

                        invoiceElement,

                        invoiceNumber:
                            state.purchase.purchaseNumber,

                        invoiceType:
                            "BUY",

                        button

                    });

                } catch (error) {

                    console.error(
                        "Buy invoice sharing failed:",
                        error
                    );

                    window.alert(
                        error?.message ||
                        "Unable to share Buy invoice PDF."
                    );

                }

            }
        );

    window.addEventListener(
        "beforeunload",
        cleanup
    );

}

/* ============================================================
   CLEANUP
   ============================================================ */

function cleanup() {
    if (
        typeof state
            .unsubscribePurchase ===
        "function"
    ) {
        state.unsubscribePurchase();

        state.unsubscribePurchase =
            null;
    }
}


/* ============================================================
   AUTH
   ============================================================ */
function startAuthentication() {
    onAuthStateChanged(
        auth,

        async (user) => {
            if (!user) {
                cleanup();

                window.location.replace(
                    "/login"
                );

                return;
            }


            if (
                state.authenticated
            ) {
                return;
            }


            state.authenticated =
                true;


            const purchaseNumber =
                readPurchaseNumber();


            if (
                !purchaseNumber
            ) {
                showError(
                    "Purchase number missing",
                    "No Buy invoice was selected."
                );

                return;
            }


            showLoading();


            try {
                const resolvedPurchaseId =
                    await resolvePurchaseIdByNumber(
                        purchaseNumber
                    );


                if (
                    !resolvedPurchaseId
                ) {
                    showError(
                        "Purchase not found",
                        "This Buy invoice does not exist or is no longer available."
                    );

                    return;
                }


                state.purchaseId =
                    resolvedPurchaseId;


                startPurchaseListener();

            } catch (error) {
                console.error(
                    "Purchase invoice resolution failed:",
                    error
                );


                showError(
                    "Unable to load invoice",
                    "The Buy invoice could not be loaded."
                );
            }
        },

        (error) => {
            console.error(
                "Purchase invoice auth failed:",
                error
            );

            showError(
                "Unable to verify session",
                "Your session could not be verified. Please sign in again."
            );
        }
    );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initialize() {
    bindEvents();

    showLoading();

    startAuthentication();
}


initialize();