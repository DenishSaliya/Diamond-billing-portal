/* ============================================================
   OM MARUTI DIAMOND
   DEDICATED PRINT INVOICE PAGE
   invoice.js

   Read-only invoice renderer.

   IMPORTANT:
   - Does NOT create/update financial data.
   - Uses historical snapshots stored on the sale.
   - Uses integer paise for money.
   - Requires authenticated Firebase user.
   ============================================================ */


/* ============================================================
   FIREBASE IMPORTS
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
   CONSTANTS
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";


const DEFAULT_LOGO_URL =
    "https://i.ibb.co/Tq73qTts/om-maruti-logo.png";


const businessRef =
    doc(
        db,
        "businesses",
        BUSINESS_ID
    );


/* ============================================================
   STATE
   ============================================================ */

const state = {

    saleId: "",

    sale: null,

    authenticated: false,

    unsubscribeSale: null

};


/* ============================================================
   DOM
   ============================================================ */

const $ = (id) =>
    document.getElementById(id);


const elements = {

    /* Toolbar */

    backButton:
        $("backButton"),

    printButton:
        $("printButton"),

    shareInvoiceWhatsappButton:
        $("shareInvoiceWhatsappButton"),

    toolbarInvoiceNumber:
        $("toolbarInvoiceNumber"),


    /* States */

    invoiceLoadingState:
        $("invoiceLoadingState"),

    invoiceErrorState:
        $("invoiceErrorState"),

    invoiceErrorTitle:
        $("invoiceErrorTitle"),

    invoiceErrorMessage:
        $("invoiceErrorMessage"),

    errorBackButton:
        $("errorBackButton"),

    invoiceContent:
        $("invoiceContent"),

    invoicePage:
        $("invoicePage"),


    /* Business */

    invoiceBusinessName:
        $("invoiceBusinessName"),

    invoiceBusinessAddress:
        $("invoiceBusinessAddress"),

    invoiceBusinessMobile:
        $("invoiceBusinessMobile"),

    invoiceBusinessEmail:
        $("invoiceBusinessEmail"),

    invoiceBusinessGstinRow:
        $("invoiceBusinessGstinRow"),

    invoiceBusinessGstin:
        $("invoiceBusinessGstin"),

    invoiceBusinessLogo:
        $("invoiceBusinessLogo"),

    invoiceLogoPlaceholder:
        $("invoiceLogoPlaceholder"),


    /* Customer */

    invoiceCustomerName:
        $("invoiceCustomerName"),

    invoiceCustomerSignatureName:
        $("invoiceCustomerSignatureName"),

    invoiceCustomerAddress:
        $("invoiceCustomerAddress"),

    invoiceCustomerMobileRow:
        $("invoiceCustomerMobileRow"),

    invoiceCustomerMobile:
        $("invoiceCustomerMobile"),

    invoiceCustomerEmailRow:
        $("invoiceCustomerEmailRow"),

    invoiceCustomerEmail:
        $("invoiceCustomerEmail"),

    invoiceCustomerGstinRow:
        $("invoiceCustomerGstinRow"),

    invoiceCustomerGstin:
        $("invoiceCustomerGstin"),


    /* Invoice metadata */

    invoiceNumber:
        $("invoiceNumber"),

    invoiceDate:
        $("invoiceDate"),

    invoiceSaleType:
        $("invoiceSaleType"),

    invoiceDueDateRow:
        $("invoiceDueDateRow"),

    invoiceDueDate:
        $("invoiceDueDate"),

    invoiceBrokerRow:
        $("invoiceBrokerRow"),

    invoiceBroker:
        $("invoiceBroker"),


    /* Items */

    invoiceItemsBody:
        $("invoiceItemsBody"),

    invoiceTotalPieces:
        $("invoiceTotalPieces"),

    invoiceTotalCarat:
        $("invoiceTotalCarat"),

    invoiceSubtotalTable:
        $("invoiceSubtotalTable"),

    invoiceTaxTable:
        $("invoiceTaxTable"),

    invoiceLineTotalTable:
        $("invoiceLineTotalTable"),


    /* Amount / notes */

    invoiceAmountWords:
        $("invoiceAmountWords"),

    invoiceNotesSection:
        $("invoiceNotesSection"),

    invoiceNotes:
        $("invoiceNotes"),

    invoiceDeclarationSection:
        $("invoiceDeclarationSection"),

    invoiceDeclaration:
        $("invoiceDeclaration"),


    /* Totals */

    invoiceSubtotal:
        $("invoiceSubtotal"),

    invoiceTax:
        $("invoiceTax"),

    invoiceDiscountRow:
        $("invoiceDiscountRow"),

    invoiceDiscount:
        $("invoiceDiscount"),

    invoiceChargesRow:
        $("invoiceChargesRow"),

    invoiceCharges:
        $("invoiceCharges"),

    invoiceRoundOffRow:
        $("invoiceRoundOffRow"),

    invoiceRoundOff:
        $("invoiceRoundOff"),

    invoiceGrandTotal:
        $("invoiceGrandTotal"),

    invoiceReceived:
        $("invoiceReceived"),

    invoiceBalance:
        $("invoiceBalance"),


    /* Signature */

    invoiceBusinessSignature:
        $("invoiceBusinessSignature")

};


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function text(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);

}


function safePaise(value) {

    return Number.isSafeInteger(value)
        ? value
        : 0;

}


/* ============================================================
   MONEY
   ============================================================ */

function formatMoney(value) {

    const paise =
        safePaise(value);


    const rupees =
        paise / 100;


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",

            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(rupees);

}


/* ============================================================
   DATES
   ============================================================ */

function timestampToDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        const date =
            value.toDate();


        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    if (
        value instanceof Date
    ) {

        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;

    }


    const parsed =
        new Date(value);


    return Number.isNaN(
        parsed.getTime()
    )
        ? null
        : parsed;

}


function formatDate(value) {

    const date =
        timestampToDate(value);


    if (!date) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);

}


/* ============================================================
   AMOUNT IN WORDS
   ============================================================ */

const WORD_ONES = [

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


const WORD_TENS = [

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


function wordsBelowHundred(number) {

    if (number < 20) {
        return WORD_ONES[number];
    }


    const tens =
        Math.floor(
            number / 10
        );


    const ones =
        number % 10;


    return [

        WORD_TENS[tens],
        WORD_ONES[ones]

    ]
        .filter(Boolean)
        .join(" ");

}


function wordsBelowThousand(number) {

    const hundred =
        Math.floor(
            number / 100
        );


    const remainder =
        number % 100;


    const parts = [];


    if (hundred > 0) {

        parts.push(
            `${WORD_ONES[hundred]} Hundred`
        );

    }


    if (remainder > 0) {

        parts.push(
            wordsBelowHundred(
                remainder
            )
        );

    }


    return parts.join(" ");

}


function integerToIndianWords(number) {

    if (number === 0) {
        return "Zero";
    }


    let remaining =
        number;


    const parts = [];


    /* Crore */

    const crore =
        Math.floor(
            remaining / 10000000
        );


    if (crore > 0) {

        parts.push(
            `${integerToIndianWords(
                crore
            )} Crore`
        );


        remaining %=
            10000000;

    }


    /* Lakh */

    const lakh =
        Math.floor(
            remaining / 100000
        );


    if (lakh > 0) {

        parts.push(
            `${wordsBelowThousand(
                lakh
            )} Lakh`
        );


        remaining %=
            100000;

    }


    /* Thousand */

    const thousand =
        Math.floor(
            remaining / 1000
        );


    if (thousand > 0) {

        parts.push(
            `${wordsBelowThousand(
                thousand
            )} Thousand`
        );


        remaining %=
            1000;

    }


    /* Remaining */

    if (remaining > 0) {

        parts.push(
            wordsBelowThousand(
                remaining
            )
        );

    }


    return parts
        .filter(Boolean)
        .join(" ");

}


function moneyToWords(paise) {

    const safeValue =
        Math.max(
            0,
            safePaise(paise)
        );


    const rupees =
        Math.floor(
            safeValue / 100
        );


    const remainingPaise =
        safeValue % 100;


    let result =
        `${integerToIndianWords(
            rupees
        )} Rupees`;


    if (remainingPaise > 0) {

        result +=
            ` and ${integerToIndianWords(
                remainingPaise
            )} Paise`;

    }


    return `${result} Only`;

}


/* ============================================================
   URL
   ============================================================ */

function readInvoiceNumber() {

    const pathname =
        decodeURIComponent(
            window.location.pathname
        );

    const parts =
        pathname
            .split("/")
            .filter(Boolean);

    if (
        parts.length >= 2 &&
        parts[0].toLowerCase() ===
            "invoices"
    ) {
        return text(
            parts[1]
        )
            .trim()
            .toUpperCase();
    }

    return "";
}


async function resolveSaleIdByInvoiceNumber(
    invoiceNumber
) {

    const cleanedInvoiceNumber =
        text(
            invoiceNumber
        )
            .trim()
            .toUpperCase();

    if (!cleanedInvoiceNumber) {
        return "";
    }


    const salesRef =
        collection(
            businessRef,
            "sales"
        );


    const saleQuery =
        query(
            salesRef,

            where(
                "invoiceNumber",
                "==",
                cleanedInvoiceNumber
            ),

            limit(1)
        );


    const snapshot =
        await getDocs(
            saleQuery
        );


    if (snapshot.empty) {
        return "";
    }


    return snapshot.docs[0].id;
}


/* ============================================================
   PAGE STATES
   ============================================================ */

function showLoading() {

    if (elements.invoiceLoadingState) {
        elements.invoiceLoadingState.hidden = false;
    }

    if (elements.invoiceErrorState) {
        elements.invoiceErrorState.hidden = true;
    }

    if (elements.invoiceContent) {
        elements.invoiceContent.hidden = true;
    }

    if (elements.shareInvoiceWhatsappButton) {
        elements.shareInvoiceWhatsappButton.disabled = true;
    }

}


function showError(
    message,
    title = "Unable to load invoice"
) {

    if (elements.invoiceLoadingState) {
        elements.invoiceLoadingState.hidden =
            true;
    }


    if (elements.invoiceContent) {
        elements.invoiceContent.hidden =
            true;
    }


    if (elements.invoiceErrorState) {
        elements.invoiceErrorState.hidden =
            false;
    }


    if (elements.invoiceErrorTitle) {

        elements.invoiceErrorTitle.textContent =
            title;

    }


    if (elements.invoiceErrorMessage) {

        elements.invoiceErrorMessage.textContent =
            message;

    }

    if (elements.shareInvoiceWhatsappButton) {
        elements.shareInvoiceWhatsappButton.disabled = true;
    }

}


function showContent() {

    if (elements.invoiceLoadingState) {
        elements.invoiceLoadingState.hidden = true;
    }

    if (elements.invoiceErrorState) {
        elements.invoiceErrorState.hidden = true;
    }

    if (elements.invoiceContent) {
        elements.invoiceContent.hidden = false;
    }

    if (elements.shareInvoiceWhatsappButton) {
        elements.shareInvoiceWhatsappButton.disabled =
            !state.sale;
    }

}

/* ============================================================
   HISTORICAL SNAPSHOTS

   IMPORTANT:
   The invoice uses the business/customer snapshot stored on
   the sale document.

   This prevents an old invoice from changing when a customer
   or business profile is edited later.
   ============================================================ */

function getCustomerSnapshot(sale) {

    const candidates = [

        sale.customerSnapshot,

        sale.customer,

        sale.billTo

    ];


    return candidates.find(
        (value) =>
            value &&
            typeof value === "object"
    ) || {};

}


function getBusinessSnapshot(sale) {

    const candidates = [

        sale.businessSnapshot,

        sale.business,

        sale.sellerSnapshot

    ];


    return candidates.find(
        (value) =>
            value &&
            typeof value === "object"
    ) || {};

}


/* ============================================================
   OPTIONAL VALUES
   ============================================================ */

function setOptionalText(
    element,
    value,
    {
        prefix = ""
    } = {}
) {

    if (!element) {
        return;
    }


    const cleaned =
        text(value).trim();


    element.hidden =
        !cleaned;


    element.textContent =
        cleaned
            ? `${prefix}${cleaned}`
            : "";

}


function setOptionalRow(
    row,
    valueElement,
    value
) {

    if (
        !row ||
        !valueElement
    ) {
        return;
    }


    const cleaned =
        text(value).trim();


    row.hidden =
        !cleaned;


    valueElement.textContent =
        cleaned || "—";

}


/* ============================================================
   TABLE CELL
   ============================================================ */

function createCell(
    value,
    className = ""
) {

    const td =
        document.createElement("td");


    /*
     * textContent keeps Firestore/user-entered values out of
     * HTML parsing.
     */

    td.textContent =
        text(value);


    if (className) {

        td.className =
            className;

    }


    return td;

}


/* ============================================================
   ITEM MONEY
   ============================================================ */

function getItemAmount(item) {

    if (
        Number.isSafeInteger(
            item.amountPaise
        )
    ) {

        return item.amountPaise;

    }


    if (
        Number.isSafeInteger(
            item.taxablePaise
        )
    ) {

        return item.taxablePaise;

    }


    return 0;

}


/* ============================================================
   ITEMS
   ============================================================ */

function renderItems(sale) {

    if (!elements.invoiceItemsBody) {
        return;
    }


    elements.invoiceItemsBody.replaceChildren();


    const items =
        Array.isArray(sale.items)
            ? sale.items
            : [];


    let totalPieces = 0;

    let totalCarat = 0;

    let tableAmount = 0;

    let tableTax = 0;

    let tableTotal = 0;


    items.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            /* Pieces */

            const pieces =
                Number.isSafeInteger(
                    item.pieces
                )
                    ? item.pieces
                    : 0;


            /* Carat */

            const carat =
                Number.parseFloat(
                    item.carat
                );


            const safeCarat =
                Number.isFinite(carat)
                    ? carat
                    : 0;


            /* Amount */

            const amountPaise =
                getItemAmount(
                    item
                );


            /* Tax */

            const taxPaise =
                safePaise(
                    item.taxPaise
                );


            /* Total */

            const totalPaise =
                Number.isSafeInteger(
                    item.totalPaise
                )
                    ? item.totalPaise
                    : (
                        amountPaise +
                        taxPaise
                    );


            totalPieces +=
                pieces;


            totalCarat +=
                safeCarat;


            tableAmount +=
                amountPaise;


            tableTax +=
                taxPaise;


            tableTotal +=
                totalPaise;


            row.append(

                /* 1. Sr */

                createCell(
                    index + 1
                ),


                /* 2. Material */

                createCell(
                    item.material
                ),


                /* 3. Description */

                createCell(
                    item.description
                ),


                /* 4. Remarks */

                createCell(
                    item.remarks
                ),


                /* 5. HSN */

                createCell(
                    item.hsn
                ),


                /* 6. Pieces */

                createCell(
                    pieces,
                    "invoice-number"
                ),


                /* 7. Carat */

                createCell(
                    safeCarat.toFixed(3),
                    "invoice-number"
                ),


                /* 8. Rate */

                createCell(
                    formatMoney(
                        item.ratePaise
                    ),
                    "invoice-number"
                ),


                /* 9. Discount % */

                createCell(
                    item.discountPercent ??
                        "0",
                    "invoice-number"
                ),


                /* 10. Amount */

                createCell(
                    formatMoney(
                        amountPaise
                    ),
                    "invoice-number"
                ),


                /* 11. Tax % */

                createCell(
                    item.taxPercent ??
                        "0",
                    "invoice-number"
                ),


                /* 12. Tax Amount */

                createCell(
                    formatMoney(
                        taxPaise
                    ),
                    "invoice-number"
                ),


                /* 13. Total */

                createCell(
                    formatMoney(
                        totalPaise
                    ),
                    "invoice-number"
                )

            );


            elements.invoiceItemsBody.appendChild(
                row
            );

        }
    );


    if (elements.invoiceTotalPieces) {

        elements.invoiceTotalPieces.textContent =
            String(totalPieces);

    }


    if (elements.invoiceTotalCarat) {

        elements.invoiceTotalCarat.textContent =
            totalCarat.toFixed(3);

    }


    if (elements.invoiceSubtotalTable) {

        elements.invoiceSubtotalTable.textContent =
            formatMoney(
                tableAmount
            );

    }


    if (elements.invoiceTaxTable) {

        elements.invoiceTaxTable.textContent =
            formatMoney(
                tableTax
            );

    }


    if (elements.invoiceLineTotalTable) {

        elements.invoiceLineTotalTable.textContent =
            formatMoney(
                tableTotal
            );

    }

}


/* ============================================================
   BUSINESS
   ============================================================ */

function renderBusiness(sale) {

    const business =
        getBusinessSnapshot(
            sale
        );


    const businessName =
        text(
            business.businessName ||
            business.name ||
            "OM MARUTI DIAMOND"
        ).trim() ||
        "OM MARUTI DIAMOND";


    if (elements.invoiceBusinessName) {

        elements.invoiceBusinessName.textContent =
            businessName;

    }


    if (elements.invoiceBusinessSignature) {

        elements.invoiceBusinessSignature.textContent =
            `For ${businessName}`;

    }


    setOptionalText(
        elements.invoiceBusinessAddress,
        business.address
    );


    setOptionalText(
        elements.invoiceBusinessMobile,
        business.mobile,
        {
            prefix: "Mobile: "
        }
    );


    setOptionalText(
        elements.invoiceBusinessEmail,
        business.email,
        {
            prefix: "Email: "
        }
    );


    /* GSTIN */

    const gstin =
        text(
            business.gstin
        ).trim();


    if (
        elements.invoiceBusinessGstinRow &&
        elements.invoiceBusinessGstin
    ) {

        elements.invoiceBusinessGstinRow.hidden =
            !gstin;


        elements.invoiceBusinessGstin.textContent =
            gstin || "—";

    }


    /* Logo */

    const snapshotLogoUrl =
        text(
            business.logoUrl
        ).trim();


    const logoUrl =
        snapshotLogoUrl ||
        DEFAULT_LOGO_URL;


    if (elements.invoiceBusinessLogo) {

        elements.invoiceBusinessLogo.src =
            logoUrl;


        elements.invoiceBusinessLogo.hidden =
            false;


        /*
         * If the historical/custom logo fails,
         * try the OM MARUTI hosted default once.
         */

        elements.invoiceBusinessLogo.onerror =
            () => {

                if (
                    elements.invoiceBusinessLogo.src !==
                    DEFAULT_LOGO_URL
                ) {

                    elements.invoiceBusinessLogo.src =
                        DEFAULT_LOGO_URL;

                    return;

                }


                elements.invoiceBusinessLogo.hidden =
                    true;


                if (
                    elements.invoiceLogoPlaceholder
                ) {

                    elements.invoiceLogoPlaceholder.hidden =
                        false;

                }

            };

    }


    if (elements.invoiceLogoPlaceholder) {

        elements.invoiceLogoPlaceholder.hidden =
            true;

    }

}


/* ============================================================
   CUSTOMER
   ============================================================ */

function renderCustomer(sale) {

    const customer =
        getCustomerSnapshot(
            sale
        );


    const customerName =
        text(
            customer.name ||
            sale.customerName ||
            "Customer"
        ).trim() ||
        "Customer";


    if (elements.invoiceCustomerName) {

        elements.invoiceCustomerName.textContent =
            customerName;

    }


    if (
        elements.invoiceCustomerSignatureName
    ) {

        elements.invoiceCustomerSignatureName.textContent =
            customerName;

    }


    setOptionalText(
        elements.invoiceCustomerAddress,
        customer.address
    );


    setOptionalRow(
        elements.invoiceCustomerMobileRow,
        elements.invoiceCustomerMobile,
        customer.mobile
    );


    setOptionalRow(
        elements.invoiceCustomerEmailRow,
        elements.invoiceCustomerEmail,
        customer.email
    );


    setOptionalRow(
        elements.invoiceCustomerGstinRow,
        elements.invoiceCustomerGstin,
        customer.gstin
    );

}


/* ============================================================
   TOTALS
   ============================================================ */

function renderTotals(sale) {

    const subtotal =
        safePaise(
            sale.subtotalPaise
        );


    const tax =
        safePaise(
            sale.taxPaise
        );


    const discount =
        safePaise(
            sale.discountPaise
        );


    const charges =
        safePaise(
            sale.chargesPaise
        );


    const roundOff =
        Number.isSafeInteger(
            sale.roundOffPaise
        )
            ? sale.roundOffPaise
            : 0;


    const grandTotal =
        safePaise(
            sale.grandTotalPaise
        );


    const received =
        safePaise(
            sale.receivedPaise
        );


    const balance =
        safePaise(
            sale.balancePaise
        );


    if (elements.invoiceSubtotal) {

        elements.invoiceSubtotal.textContent =
            formatMoney(
                subtotal
            );

    }


    if (elements.invoiceTax) {

        elements.invoiceTax.textContent =
            formatMoney(
                tax
            );

    }


    /* Discount */

    if (elements.invoiceDiscountRow) {

        elements.invoiceDiscountRow.hidden =
            discount === 0;

    }


    if (elements.invoiceDiscount) {

        elements.invoiceDiscount.textContent =
            formatMoney(
                discount
            );

    }


    /* Charges */

    if (elements.invoiceChargesRow) {

        elements.invoiceChargesRow.hidden =
            charges === 0;

    }


    if (elements.invoiceCharges) {

        elements.invoiceCharges.textContent =
            formatMoney(
                charges
            );

    }


    /* Round off */

    if (elements.invoiceRoundOffRow) {

        elements.invoiceRoundOffRow.hidden =
            roundOff === 0;

    }


    if (elements.invoiceRoundOff) {

        elements.invoiceRoundOff.textContent =
            formatMoney(
                roundOff
            );

    }


    /* Grand total */

    if (elements.invoiceGrandTotal) {

        elements.invoiceGrandTotal.textContent =
            formatMoney(
                grandTotal
            );

    }


    /* Received */

    if (elements.invoiceReceived) {

        elements.invoiceReceived.textContent =
            formatMoney(
                received
            );

    }


    /* Balance */

    if (elements.invoiceBalance) {

        elements.invoiceBalance.textContent =
            formatMoney(
                balance
            );

    }


    /* Words */

    if (elements.invoiceAmountWords) {

        elements.invoiceAmountWords.textContent =
            moneyToWords(
                grandTotal
            );

    }

}


/* ============================================================
   MAIN SALE RENDER
   ============================================================ */

function renderSale() {

    const sale =
        state.sale;


    if (!sale) {
        return;
    }


    /* Invoice number */

    const invoiceNumber =
        text(
            sale.invoiceNumber
        ).trim() ||
        "Sell Invoice";


    document.title =
        `${invoiceNumber} | OM MARUTI DIAMOND`;


    if (elements.toolbarInvoiceNumber) {

        elements.toolbarInvoiceNumber.textContent =
            invoiceNumber;

    }


    if (elements.invoiceNumber) {

        elements.invoiceNumber.textContent =
            invoiceNumber;

    }


    /* Invoice date */

    if (elements.invoiceDate) {

        elements.invoiceDate.textContent =
            formatDate(
                sale.invoiceDate
            );

    }


    /* Cash / Credit */

    const saleType =
        sale.saleType === "credit"
            ? "Credit"
            : "Cash";


    if (elements.invoiceSaleType) {

        elements.invoiceSaleType.textContent =
            saleType;

    }


    /* Due date only for Credit */

    if (
        sale.saleType === "credit" &&
        sale.dueDate
    ) {

        if (elements.invoiceDueDateRow) {

            elements.invoiceDueDateRow.hidden =
                false;

        }


        if (elements.invoiceDueDate) {

            elements.invoiceDueDate.textContent =
                formatDate(
                    sale.dueDate
                );

        }

    } else {

        if (elements.invoiceDueDateRow) {

            elements.invoiceDueDateRow.hidden =
                true;

        }

    }


    /* Broker */

    const broker =
        text(
            sale.broker
        ).trim();


    if (elements.invoiceBrokerRow) {

        elements.invoiceBrokerRow.hidden =
            !broker;

    }


    if (elements.invoiceBroker) {

        elements.invoiceBroker.textContent =
            broker || "—";

    }


    /* Notes */

    const notes =
        text(
            sale.notes
        ).trim();


    if (elements.invoiceNotesSection) {

        elements.invoiceNotesSection.hidden =
            !notes;

    }


    if (elements.invoiceNotes) {

        elements.invoiceNotes.textContent =
            notes;

    }


    /* Declaration */

    const declaration =
        text(
            sale.declaration
        ).trim();


    if (
        elements.invoiceDeclarationSection
    ) {

        elements.invoiceDeclarationSection.hidden =
            !declaration;

    }


    if (elements.invoiceDeclaration) {

        elements.invoiceDeclaration.textContent =
            declaration;

    }


    /* Render sections */

    renderBusiness(
        sale
    );


    renderCustomer(
        sale
    );


    renderItems(
        sale
    );


    renderTotals(
        sale
    );


    showContent();

}


/* ============================================================
   FIRESTORE SALE LISTENER
   ============================================================ */

function startSaleListener() {

    cleanup();


    const saleRef =
        doc(
            businessRef,
            "sales",
            state.saleId
        );


    state.unsubscribeSale =
        onSnapshot(

            saleRef,


            /* Success */

            (snapshot) => {

                if (!snapshot.exists()) {

                    state.sale =
                        null;


                    showError(
                        "This Sell invoice does not exist."
                    );


                    return;

                }


                state.sale = {

                    id:
                        snapshot.id,

                    ...snapshot.data()

                };


                renderSale();

            },


            /* Error */

            (error) => {

                console.error(
                    "Invoice listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );


                if (
                    error?.code ===
                    "permission-denied"
                ) {

                    showError(
                        "You are not authorized to view this invoice.",
                        "Access denied"
                    );


                    return;

                }


                showError(
                    "The Sell invoice could not be loaded."
                );

            }

        );

}


/* ============================================================
   PRINT
   ============================================================ */

function handlePrint() {

    if (!state.sale) {
        return;
    }


    window.print();

}


/* ============================================================
   BACK
   ============================================================ */

function goBackToSale() {

    const invoiceNumber =
        text(
            state.sale?.invoiceNumber
        )
            .trim()
            .toUpperCase();

    if (invoiceNumber) {

        window.location.href =
            `/sales/${encodeURIComponent(
                invoiceNumber
            )}`;

        return;
    }


    window.location.href =
        "/sales";
}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {

    elements.printButton?.addEventListener(
        "click",
        handlePrint
    );

    elements.backButton?.addEventListener(
        "click",
        goBackToSale
    );

    elements.errorBackButton?.addEventListener(
        "click",
        goBackToSale
    );

    elements.shareInvoiceWhatsappButton
        ?.addEventListener(
            "click",
            async () => {

                if (!state.sale) {
                    window.alert(
                        "Sell invoice is not ready."
                    );
                    return;
                }

                const button =
                    elements.shareInvoiceWhatsappButton;

                try {

                    await shareInvoicePdf({

                        invoiceElement:
                            elements.invoicePage,

                        invoiceNumber:
                            state.sale.invoiceNumber,

                        invoiceType:
                            "SELL",

                        button

                    });

                } catch (error) {

                    console.error(
                        "Sell invoice sharing failed:",
                        error
                    );

                    window.alert(
                        error?.message ||
                        "Unable to share Sell invoice PDF."
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
        typeof state.unsubscribeSale ===
        "function"
    ) {

        state.unsubscribeSale();


        state.unsubscribeSale =
            null;

    }

}


/* ============================================================
   AUTH
   ============================================================ */

function startAuth() {

    onAuthStateChanged(

        auth,

        async (user) => {

            if (!user) {

                window.location.replace(
                    "/login"
                );

                return;
            }


            state.authenticated =
                true;


            const invoiceNumber =
                readInvoiceNumber();


            if (!invoiceNumber) {

                showError(
                    "No Sell invoice was selected."
                );

                return;
            }


            try {

                const resolvedSaleId =
                    await resolveSaleIdByInvoiceNumber(
                        invoiceNumber
                    );


                if (!resolvedSaleId) {

                    showError(
                        "This Sell invoice does not exist."
                    );

                    return;
                }


                state.saleId =
                    resolvedSaleId;


                startSaleListener();

            } catch (error) {

                console.error(
                    "Invoice resolution failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );


                if (
                    error?.code ===
                    "permission-denied"
                ) {

                    window.location.replace(
                        "/login"
                    );

                    return;
                }


                showError(
                    "The Sell invoice could not be loaded."
                );
            }
        },


        (error) => {

            console.error(
                "Invoice authentication failed:",
                error?.code ||
                error?.message ||
                "unknown-error"
            );

            showError(
                "Unable to verify your session."
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

    startAuth();
}


/* ============================================================
   START
   ============================================================ */

initialize();