/* ============================================================
   OM MARUTI DIAMOND
   SELL INVOICE DETAIL PAGE
   ============================================================ */

import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";

import {
    auth,
    db,
    functions
} from "../firebase.js";


/* ============================================================
   CONSTANTS
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";

const businessRef =
    doc(
        db,
        "businesses",
        BUSINESS_ID
    );

const recordSaleReceiptCallable =
    httpsCallable(
        functions,
        "recordSaleReceipt"
    );

const MAX_SEARCH_RESULTS = 12;
/* ============================================================
   STATE
   ============================================================ */

const state = {
    saleId: "",
    sale: null,
    payments: [],

    /* Global search data */
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],

    authenticated: false,
    receiptSubmitting: false,

    unsubscribeSale: null,
    unsubscribePayments: null,

    unsubscribeCustomers: null,
    unsubscribeSuppliers: null,
    unsubscribeSalesSearch: null,
    unsubscribePurchasesSearch: null
};


/* ============================================================
   DOM
   ============================================================ */

const $ = (id) =>
    document.getElementById(id);

const elements = {
    sidebar: $("sidebar"),
    mobileMenuButton: $("mobileMenuButton"),

    currentDate: $("currentDate"),

    globalSearchInput: $("globalSearchInput"),
    globalSearchResults: $("globalSearchResults"),
    globalSearchResultsContent: $("globalSearchResultsContent"),

    logoutButton: $("logoutButton"),

    saleLoadingState: $("saleLoadingState"),
    saleErrorState: $("saleErrorState"),
    saleErrorMessage: $("saleErrorMessage"),
    saleContent: $("saleContent"),

    pageInvoiceNumber: $("pageInvoiceNumber"),
    saleStatusBadge: $("saleStatusBadge"),

    printInvoiceButton: $("printInvoiceButton"),
    duplicateInvoiceButton: $("duplicateInvoiceButton"),

    recordReceiptButton: $("recordReceiptButton"),
    historyRecordReceiptButton:
        $("historyRecordReceiptButton"),

    summaryGrandTotal: $("summaryGrandTotal"),
    summaryReceived: $("summaryReceived"),
    summaryBalance: $("summaryBalance"),
    summaryDueDate: $("summaryDueDate"),

    invoiceBusinessName: $("invoiceBusinessName"),
    invoiceBusinessAddress: $("invoiceBusinessAddress"),
    invoiceBusinessMobile: $("invoiceBusinessMobile"),
    invoiceBusinessEmail: $("invoiceBusinessEmail"),
    invoiceBusinessGstin: $("invoiceBusinessGstin"),
    invoiceBusinessLogo: $("invoiceBusinessLogo"),
    invoiceLogoPlaceholder: $("invoiceLogoPlaceholder"),

    invoiceCustomerName: $("invoiceCustomerName"),
    invoiceCustomerSignatureName: $("invoiceCustomerSignatureName"),
    invoiceCustomerAddress: $("invoiceCustomerAddress"),

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

    invoiceNumber: $("invoiceNumber"),
    invoiceDate: $("invoiceDate"),
    invoiceSaleType: $("invoiceSaleType"),

    invoiceDueDateRow: $("invoiceDueDateRow"),
    invoiceDueDate: $("invoiceDueDate"),

    invoiceBrokerRow: $("invoiceBrokerRow"),
    invoiceBroker: $("invoiceBroker"),

    invoiceItemsBody: $("invoiceItemsBody"),

    invoiceTotalPieces: $("invoiceTotalPieces"),
    invoiceTotalCarat: $("invoiceTotalCarat"),

    invoiceSubtotalTable: $("invoiceSubtotalTable"),
    invoiceTaxTable: $("invoiceTaxTable"),
    invoiceLineTotalTable: $("invoiceLineTotalTable"),

    invoiceAmountWords: $("invoiceAmountWords"),

    invoiceNotesSection: $("invoiceNotesSection"),
    invoiceNotes: $("invoiceNotes"),

    invoiceDeclarationSection:
        $("invoiceDeclarationSection"),
    invoiceDeclaration:
        $("invoiceDeclaration"),

    invoiceSubtotal: $("invoiceSubtotal"),
    invoiceTax: $("invoiceTax"),

    invoiceDiscountRow: $("invoiceDiscountRow"),
    invoiceDiscount: $("invoiceDiscount"),

    invoiceChargesRow: $("invoiceChargesRow"),
    invoiceCharges: $("invoiceCharges"),

    invoiceRoundOffRow: $("invoiceRoundOffRow"),
    invoiceRoundOff: $("invoiceRoundOff"),

    invoiceGrandTotal: $("invoiceGrandTotal"),
    invoiceReceived: $("invoiceReceived"),
    invoiceBalance: $("invoiceBalance"),

    invoiceBusinessSignature:
        $("invoiceBusinessSignature"),

    paymentHistoryBody: $("paymentHistoryBody"),
    paymentHistoryEmpty: $("paymentHistoryEmpty"),

    receiptModal: $("receiptModal"),
    closeReceiptModalButton:
        $("closeReceiptModalButton"),
    cancelReceiptButton:
        $("cancelReceiptButton"),

    receiptForm: $("receiptForm"),

    receiptInvoiceNumber:
        $("receiptInvoiceNumber"),
    receiptOutstanding:
        $("receiptOutstanding"),

    receiptAmount: $("receiptAmount"),
    receiptAmountError:
        $("receiptAmountError"),

    receiptDate: $("receiptDate"),
    receiptDateError:
        $("receiptDateError"),

    receiptMethod: $("receiptMethod"),
    receiptReference:
        $("receiptReference"),
    receiptNote: $("receiptNote"),

    receiptFormMessage:
        $("receiptFormMessage"),

    saveReceiptButton:
        $("saveReceiptButton"),
    saveReceiptButtonText:
        $("saveReceiptButtonText"),
    saveReceiptSpinner:
        $("saveReceiptSpinner")
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


function formatPlainMoney(value) {
    const paise =
        safePaise(value);

    return (
        paise / 100
    ).toFixed(2);
}


/* ============================================================
   DATE HELPERS
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


function localDateInputValue(date = new Date()) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function renderCurrentDate() {
    if (!elements.currentDate) {
        return;
    }

    elements.currentDate.textContent =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(new Date());
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
        Math.floor(number / 10);

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
        Math.floor(number / 100);

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

    const crore =
        Math.floor(
            remaining / 10000000
        );

    if (crore > 0) {
        parts.push(
            `${integerToIndianWords(crore)} Crore`
        );

        remaining %=
            10000000;
    }

    const lakh =
        Math.floor(
            remaining / 100000
        );

    if (lakh > 0) {
        parts.push(
            `${wordsBelowThousand(lakh)} Lakh`
        );

        remaining %=
            100000;
    }

    const thousand =
        Math.floor(
            remaining / 1000
        );

    if (thousand > 0) {
        parts.push(
            `${wordsBelowThousand(thousand)} Thousand`
        );

        remaining %=
            1000;
    }

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
        `${integerToIndianWords(rupees)} Rupees`;

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

/* ============================================================
   URL
   Clean route:
   /sales/OMD-S-0001
   ============================================================ */

function readSaleNumber() {
    const pathname =
        decodeURIComponent(
            window.location.pathname
        );

    const parts =
        pathname
            .split("/")
            .filter(Boolean);

    /*
     * Expected:
     * /sales/OMD-S-0001
     */

    if (
        parts.length >= 2 &&
        parts[0].toLowerCase() === "sales"
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
        text(invoiceNumber)
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
   PAGE STATE
   ============================================================ */

function showLoading() {
    elements.saleLoadingState.hidden =
        false;

    elements.saleErrorState.hidden =
        true;

    elements.saleContent.hidden =
        true;
}


function showError(message) {
    elements.saleLoadingState.hidden =
        true;

    elements.saleContent.hidden =
        true;

    elements.saleErrorState.hidden =
        false;

    elements.saleErrorMessage.textContent =
        message;
}


function showContent() {
    elements.saleLoadingState.hidden =
        true;

    elements.saleErrorState.hidden =
        true;

    elements.saleContent.hidden =
        false;
}


/* ============================================================
   SNAPSHOT HELPERS

   We deliberately render the customer/business snapshots stored
   on the invoice rather than reading today's customer/profile
   values.

   Historical invoices must not change when master data changes.
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
   STATUS
   ============================================================ */

function getDisplayStatus(sale) {
    if (!sale) {
        return "pending";
    }

    if (sale.status === "draft") {
        return "draft";
    }

    if (
        sale.status === "cancelled"
    ) {
        return "cancelled";
    }

    const balance =
        safePaise(
            sale.balancePaise
        );

    if (balance <= 0) {
        return "paid";
    }

    const dueDate =
        timestampToDate(
            sale.dueDate
        );

    if (dueDate) {
        const endOfDueDate =
            new Date(dueDate);

        endOfDueDate.setHours(
            23,
            59,
            59,
            999
        );

        if (
            endOfDueDate.getTime() <
            Date.now()
        ) {
            return "overdue";
        }
    }

    const received =
        safePaise(
            sale.receivedPaise
        );

    return received > 0
        ? "partially_paid"
        : "pending";
}


function statusLabel(status) {
    switch (status) {
        case "partially_paid":
            return "Partially Paid";

        case "paid":
            return "Paid";

        case "overdue":
            return "Overdue";

        case "draft":
            return "Draft";

        case "cancelled":
            return "Cancelled";

        default:
            return "Pending";
    }
}


/* ============================================================
   CONDITIONAL TEXT
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
    const cleaned =
        text(value).trim();

    row.hidden =
        !cleaned;

    valueElement.textContent =
        cleaned || "—";
}


/* ============================================================
   ITEM RENDERING
   ============================================================ */

function createCell(
    value,
    className = ""
) {
    const td =
        document.createElement("td");

    td.textContent =
        text(value);

    if (className) {
        td.className =
            className;
    }

    return td;
}


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


function renderItems(sale) {
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
                document.createElement("tr");

            const pieces =
                Number.isSafeInteger(
                    item.pieces
                )
                    ? item.pieces
                    : 0;

            const carat =
                Number.parseFloat(
                    item.carat
                );

            const safeCarat =
                Number.isFinite(carat)
                    ? carat
                    : 0;

            const amountPaise =
                getItemAmount(item);

            const taxPaise =
                safePaise(
                    item.taxPaise
                );

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
                createCell(
                    index + 1
                ),

                createCell(
                    item.material
                ),

                createCell(
                    item.description
                ),

                createCell(
                    item.remarks
                ),

                createCell(
                    item.hsn
                ),

                createCell(
                    pieces,
                    "number-column"
                ),

                createCell(
                    safeCarat.toFixed(3),
                    "number-column"
                ),

                createCell(
                    formatMoney(
                        item.ratePaise
                    ),
                    "number-column"
                ),

                createCell(
                    item.discountPercent ??
                    "0",
                    "number-column"
                ),

                createCell(
                    formatMoney(
                        amountPaise
                    ),
                    "number-column"
                ),

                createCell(
                    item.taxPercent ??
                    "0",
                    "number-column"
                ),

                createCell(
                    formatMoney(
                        taxPaise
                    ),
                    "number-column"
                ),

                createCell(
                    formatMoney(
                        totalPaise
                    ),
                    "number-column"
                )
            );


            elements.invoiceItemsBody.appendChild(
                row
            );
        }
    );


    elements.invoiceTotalPieces.textContent =
        String(totalPieces);

    elements.invoiceTotalCarat.textContent =
        totalCarat.toFixed(3);

    elements.invoiceSubtotalTable.textContent =
        formatMoney(
            tableAmount
        );

    elements.invoiceTaxTable.textContent =
        formatMoney(
            tableTax
        );

    elements.invoiceLineTotalTable.textContent =
        formatMoney(
            tableTotal
        );
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


    elements.invoiceBusinessName.textContent =
        businessName;

    elements.invoiceBusinessSignature.textContent =
        `For ${businessName}`;


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


    setOptionalText(
        elements.invoiceBusinessGstin,
        business.gstin,
        {
            prefix: "GSTIN: "
        }
    );


    const logoUrl =
    text(
        business.logoUrl
    ).trim();

const defaultLogoUrl =
    "https://i.ibb.co/Tq73qTts/om-maruti-logo.png";

if (elements.invoiceBusinessLogo) {

    elements.invoiceBusinessLogo.src =
        logoUrl || defaultLogoUrl;

    elements.invoiceBusinessLogo.hidden =
        false;
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
    ).trim() || "Customer";

    elements.invoiceCustomerName.textContent =
        customerName;

    if (elements.invoiceCustomerSignatureName) {
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


    elements.summaryGrandTotal.textContent =
        formatMoney(
            grandTotal
        );

    elements.summaryReceived.textContent =
        formatMoney(
            received
        );

    elements.summaryBalance.textContent =
        formatMoney(
            balance
        );


    elements.invoiceSubtotal.textContent =
        formatMoney(
            subtotal
        );

    elements.invoiceTax.textContent =
        formatMoney(
            tax
        );


    elements.invoiceDiscountRow.hidden =
        discount === 0;

    elements.invoiceDiscount.textContent =
        formatMoney(
            discount
        );


    elements.invoiceChargesRow.hidden =
        charges === 0;

    elements.invoiceCharges.textContent =
        formatMoney(
            charges
        );


    elements.invoiceRoundOffRow.hidden =
        roundOff === 0;

    elements.invoiceRoundOff.textContent =
        formatMoney(
            roundOff
        );


    elements.invoiceGrandTotal.textContent =
        formatMoney(
            grandTotal
        );

    elements.invoiceReceived.textContent =
        formatMoney(
            received
        );

    elements.invoiceBalance.textContent =
        formatMoney(
            balance
        );


    elements.invoiceAmountWords.textContent =
        moneyToWords(
            grandTotal
        );
}


/* ============================================================
   SALE RENDER
   ============================================================ */

function renderSale() {
    const sale =
        state.sale;

    if (!sale) {
        return;
    }


    const invoiceNumber =
        text(
            sale.invoiceNumber
        ).trim() || "Sell Invoice";


    document.title =
        `${invoiceNumber} | OM MARUTI DIAMOND`;


    elements.pageInvoiceNumber.textContent =
        invoiceNumber;

    elements.invoiceNumber.textContent =
        invoiceNumber;


    const displayStatus =
        getDisplayStatus(
            sale
        );


    elements.saleStatusBadge.textContent =
        statusLabel(
            displayStatus
        );

    elements.saleStatusBadge.dataset.status =
        displayStatus;


    elements.invoiceDate.textContent =
        formatDate(
            sale.invoiceDate
        );


    const saleType =
        sale.saleType === "credit"
            ? "Credit"
            : "Cash";

    elements.invoiceSaleType.textContent =
        saleType;


    if (
        sale.saleType === "credit" &&
        sale.dueDate
    ) {
        const formattedDueDate =
            formatDate(
                sale.dueDate
            );

        elements.invoiceDueDateRow.hidden =
            false;

        elements.invoiceDueDate.textContent =
            formattedDueDate;

        elements.summaryDueDate.textContent =
            formattedDueDate;
    } else {
        elements.invoiceDueDateRow.hidden =
            true;

        elements.summaryDueDate.textContent =
            "No Due Date";
    }


    const broker =
        text(
            sale.broker
        ).trim();

    elements.invoiceBrokerRow.hidden =
        !broker;

    elements.invoiceBroker.textContent =
        broker || "—";


    const notes =
        text(
            sale.notes
        ).trim();

    elements.invoiceNotesSection.hidden =
        !notes;

    elements.invoiceNotes.textContent =
        notes;


    const declaration =
        text(
            sale.declaration
        ).trim();

    elements.invoiceDeclarationSection.hidden =
        !declaration;

    elements.invoiceDeclaration.textContent =
        declaration;


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


    const balance =
        safePaise(
            sale.balancePaise
        );


    /*
     * Fully settled invoices cannot receive another receipt.
     */

    elements.recordReceiptButton.hidden =
        balance <= 0 ||
        sale.status === "draft" ||
        sale.status === "cancelled";

    elements.historyRecordReceiptButton.hidden =
        balance <= 0 ||
        sale.status === "draft" ||
        sale.status === "cancelled";


    showContent();
}


/* ============================================================
   PAYMENT HISTORY
   ============================================================ */

function paymentDateValue(payment) {
    return (
        payment.paymentDate ||
        payment.receiptDate ||
        payment.date ||
        payment.createdAt
    );
}


function paymentAmount(payment) {
    if (
        Number.isSafeInteger(
            payment.amountPaise
        )
    ) {
        return payment.amountPaise;
    }

    return 0;
}


function renderPayments() {
    elements.paymentHistoryBody.replaceChildren();


    if (
        state.payments.length === 0
    ) {
        elements.paymentHistoryEmpty.hidden =
            false;

        return;
    }


    elements.paymentHistoryEmpty.hidden =
        true;


    state.payments.forEach(
        (payment) => {
            const row =
                document.createElement("tr");


            row.append(
                createCell(
                    formatDate(
                        paymentDateValue(
                            payment
                        )
                    )
                ),

                createCell(
                    text(
                        payment.method ||
                        "—"
                    ).toUpperCase()
                ),

                createCell(
                    payment.reference ||
                    "—"
                ),

                createCell(
                    payment.note ||
                    "—"
                ),

                createCell(
                    formatMoney(
                        paymentAmount(
                            payment
                        )
                    ),
                    "number-column"
                )
            );


            elements.paymentHistoryBody.appendChild(
                row
            );
        }
    );
}


/* ============================================================
   REALTIME SALE
   ============================================================ */

function startSaleListener() {
    if (
        typeof state.unsubscribeSale ===
        "function"
    ) {
        state.unsubscribeSale();
    }


    const saleRef =
        doc(
            businessRef,
            "sales",
            state.saleId
        );


    state.unsubscribeSale =
        onSnapshot(
            saleRef,

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
                    id: snapshot.id,
                    ...snapshot.data()
                };


                renderSale();
            },

            async (error) => {
                console.error(
                    "Sell invoice listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );


                if (
                    error?.code ===
                    "permission-denied"
                ) {
                    await handleUnauthorized();

                    return;
                }


                showError(
                    "The Sell invoice could not be loaded."
                );
            }
        );
}


/* ============================================================
   REALTIME RECEIPTS
   ============================================================ */

function startPaymentListener() {
    if (
        typeof state.unsubscribePayments ===
        "function"
    ) {
        state.unsubscribePayments();
    }


    const paymentsRef =
        collection(
            businessRef,
            "salePayments"
        );


    /*
     * This query expects each receipt document to contain saleId.
     *
     * orderBy(paymentDate) matches the secure receipt model.
     */

    const paymentsQuery =
        query(
            paymentsRef,
            where(
                "saleId",
                "==",
                state.saleId
            ),
            orderBy(
                "paymentDate",
                "desc"
            )
        );


    state.unsubscribePayments =
        onSnapshot(
            paymentsQuery,

            (snapshot) => {
                state.payments =
                    snapshot.docs.map(
                        (paymentDocument) => ({
                            id:
                                paymentDocument.id,

                            ...paymentDocument.data()
                        })
                    );


                renderPayments();
            },

            (error) => {
                console.error(
                    "Sale payment listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );


                /*
                 * Do not hide the invoice if only payment
                 * history fails.
                 */

                elements.paymentHistoryBody.replaceChildren();

                elements.paymentHistoryEmpty.hidden =
                    false;

                elements.paymentHistoryEmpty.textContent =
                    "Receipt history could not be loaded.";
            }
        );
}


/* ============================================================
   RECEIPT MONEY PARSER
   ============================================================ */

function parseMoneyToPaise(value) {
    const cleaned =
        text(value)
            .trim()
            .replace(/,/g, "");


    if (
        !/^\d+(?:\.\d{0,2})?$/.test(
            cleaned
        )
    ) {
        return null;
    }


    const [
        rupeesPart,
        paisePart = ""
    ] =
        cleaned.split(".");


    const rupees =
        Number(
            rupeesPart
        );


    if (
        !Number.isSafeInteger(
            rupees
        )
    ) {
        return null;
    }


    const normalizedPaise =
        (
            paisePart +
            "00"
        ).slice(0, 2);


    const paise =
        Number(
            normalizedPaise
        );


    const result =
        (
            rupees * 100
        ) +
        paise;


    return Number.isSafeInteger(
        result
    )
        ? result
        : null;
}


/* ============================================================
   RECEIPT MODAL
   ============================================================ */

function clearReceiptErrors() {
    elements.receiptAmountError.textContent =
        "";

    elements.receiptDateError.textContent =
        "";

    elements.receiptFormMessage.textContent =
        "";

    elements.receiptFormMessage.hidden =
        true;
}


function showReceiptMessage(
    message,
    type = "error"
) {
    elements.receiptFormMessage.textContent =
        message;

    elements.receiptFormMessage.dataset.type =
        type;

    elements.receiptFormMessage.hidden =
        false;
}


function openReceiptModal() {
    const sale =
        state.sale;

    if (!sale) {
        return;
    }


    const balance =
        safePaise(
            sale.balancePaise
        );


    if (balance <= 0) {
        return;
    }


    clearReceiptErrors();


    elements.receiptInvoiceNumber.textContent =
        sale.invoiceNumber || "—";

    elements.receiptOutstanding.textContent =
        formatMoney(
            balance
        );


    /*
     * Default to the entire outstanding balance.
     * Admin can reduce it for a partial receipt.
     */

    elements.receiptAmount.value =
        formatPlainMoney(
            balance
        );

    elements.receiptDate.value =
        localDateInputValue();

    elements.receiptMethod.value =
        "cash";

    elements.receiptReference.value =
        "";

    elements.receiptNote.value =
        "";


    elements.receiptModal.hidden =
        false;

    document.body.classList.add(
        "modal-open"
    );


    window.setTimeout(
        () => {
            elements.receiptAmount.focus();
            elements.receiptAmount.select();
        },
        0
    );
}


function closeReceiptModal() {
    if (
        state.receiptSubmitting
    ) {
        return;
    }


    elements.receiptModal.hidden =
        true;

    document.body.classList.remove(
        "modal-open"
    );

    clearReceiptErrors();
}


/* ============================================================
   RECEIPT SUBMITTING STATE
   ============================================================ */

function setReceiptSubmitting(
    submitting
) {
    state.receiptSubmitting =
        submitting;


    elements.saveReceiptButton.disabled =
        submitting;

    elements.cancelReceiptButton.disabled =
        submitting;

    elements.closeReceiptModalButton.disabled =
        submitting;

    elements.receiptAmount.disabled =
        submitting;

    elements.receiptDate.disabled =
        submitting;

    elements.receiptMethod.disabled =
        submitting;

    elements.receiptReference.disabled =
        submitting;

    elements.receiptNote.disabled =
        submitting;


    elements.saveReceiptButtonText.textContent =
        submitting
            ? "Saving..."
            : "Save Receipt";

    elements.saveReceiptSpinner.hidden =
        !submitting;
}


/* ============================================================
   RECEIPT VALIDATION
   ============================================================ */

function validateReceipt() {
    clearReceiptErrors();


    const sale =
        state.sale;

    if (!sale) {
        showReceiptMessage(
            "The invoice is no longer available."
        );

        return null;
    }


    const balance =
        safePaise(
            sale.balancePaise
        );


    const amountPaise =
        parseMoneyToPaise(
            elements.receiptAmount.value
        );


    let valid = true;


    if (
        amountPaise === null ||
        amountPaise <= 0
    ) {
        elements.receiptAmountError.textContent =
            "Enter a valid receipt amount.";

        valid = false;
    } else if (
        amountPaise >
        balance
    ) {
        elements.receiptAmountError.textContent =
            "Receipt cannot exceed the outstanding balance.";

        valid = false;
    }


    const paymentDate =
        elements.receiptDate.value;


    if (!paymentDate) {
        elements.receiptDateError.textContent =
            "Select the receipt date.";

        valid = false;
    }


    if (!valid) {
        return null;
    }


    return {
        saleId:
            state.saleId,

        amountPaise,

        paymentDate,

        method:
            elements.receiptMethod.value,

        reference:
            elements.receiptReference.value.trim(),

        note:
            elements.receiptNote.value.trim()
    };
}


/* ============================================================
   RECEIPT ERRORS
   ============================================================ */

function receiptErrorMessage(error) {
    const code =
        text(
            error?.code
        ).replace(
            /^functions\//,
            ""
        );


    switch (code) {
        case "unauthenticated":
            return "Your session has expired.";

        case "permission-denied":
            return "You are not authorized to record receipts.";

        case "invalid-argument":
            return (
                error?.message ||
                "Check the receipt details."
            );

        case "not-found":
            return (
                error?.message ||
                "The Sell invoice could not be found."
            );

        case "failed-precondition":
            return (
                error?.message ||
                "This receipt cannot be recorded."
            );

        case "unavailable":
            return (
                "The billing service is temporarily unavailable."
            );

        default:
            return (
                "The receipt could not be saved. Please try again."
            );
    }
}


/* ============================================================
   RECORD RECEIPT
   ============================================================ */

async function handleReceiptSubmit(
    event
) {
    event.preventDefault();


    if (
        state.receiptSubmitting
    ) {
        return;
    }


    const payload =
        validateReceipt();


    if (!payload) {
        return;
    }


    setReceiptSubmitting(
        true
    );


    showReceiptMessage(
        "Saving receipt securely...",
        "info"
    );


    try {
        const result =
            await recordSaleReceiptCallable(
                payload
            );


        if (
            result?.data?.success ===
            false
        ) {
            throw new Error(
                "Receipt was not accepted."
            );
        }


        showReceiptMessage(
            "Receipt recorded successfully.",
            "success"
        );


        /*
         * Firestore listeners update the invoice and payment
         * history automatically. No manual page refresh needed.
         */

        window.setTimeout(
            () => {
                elements.receiptModal.hidden =
                    true;

                document.body.classList.remove(
                    "modal-open"
                );

                clearReceiptErrors();
            },
            350
        );

    } catch (error) {
        console.error(
            "Record receipt failed:",
            error?.code ||
            error?.message ||
            "unknown-error"
        );


        showReceiptMessage(
            receiptErrorMessage(
                error
            ),
            "error"
        );


        const code =
            text(
                error?.code
            ).replace(
                /^functions\//,
                ""
            );


        if (
            code === "unauthenticated" ||
            code === "permission-denied"
        ) {
            window.setTimeout(
                () => {
                    handleUnauthorized();
                },
                300
            );
        }

    } finally {
        setReceiptSubmitting(
            false
        );
    }
}


/* ============================================================
   PRINT
   ============================================================ */

/* ============================================================
   PRINT INVOICE

   Opens the dedicated A4 invoice page instead of printing
   the Sell detail/dashboard page.
   ============================================================ */
/* ============================================================
   PRINT INVOICE

   Open dedicated invoice in the SAME authenticated tab.
   ============================================================ */

function handlePrint() {

    const invoiceNumber =
        text(
            state.sale?.invoiceNumber
        )
            .trim()
            .toUpperCase();

    if (!invoiceNumber) {
        return;
    }

    window.location.href =
        `/invoices/${encodeURIComponent(
            invoiceNumber
        )}`;
}


/* ============================================================
   DUPLICATE

   We intentionally do NOT duplicate financial documents yet.

   A future backend callable should create the duplicate safely.
   ============================================================ */

function handleDuplicate() {
    window.alert(
        "Secure invoice duplication will be added as a backend operation."
    );
}



/* ============================================================
   GLOBAL SEARCH FIRESTORE DATA
   ============================================================ */

function snapshotToSearchRecords(
    snapshot
) {
    return snapshot.docs.map(
        (documentSnapshot) => ({
            id:
                documentSnapshot.id,

            ...documentSnapshot.data()
        })
    );
}


function startGlobalSearchListeners() {
    if (
        typeof state.unsubscribeCustomers ===
        "function"
    ) {
        state.unsubscribeCustomers();
    }

    if (
        typeof state.unsubscribeSuppliers ===
        "function"
    ) {
        state.unsubscribeSuppliers();
    }

    if (
        typeof state.unsubscribeSalesSearch ===
        "function"
    ) {
        state.unsubscribeSalesSearch();
    }

    if (
        typeof state.unsubscribePurchasesSearch ===
        "function"
    ) {
        state.unsubscribePurchasesSearch();
    }


    state.unsubscribeCustomers =
        onSnapshot(
            collection(
                businessRef,
                "customers"
            ),

            (snapshot) => {
                state.customers =
                    snapshotToSearchRecords(
                        snapshot
                    );
            },

            (error) => {
                console.error(
                    "Customer search listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );
            }
        );


    state.unsubscribeSuppliers =
        onSnapshot(
            collection(
                businessRef,
                "suppliers"
            ),

            (snapshot) => {
                state.suppliers =
                    snapshotToSearchRecords(
                        snapshot
                    );
            },

            (error) => {
                console.error(
                    "Supplier search listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );
            }
        );


    state.unsubscribeSalesSearch =
        onSnapshot(
            collection(
                businessRef,
                "sales"
            ),

            (snapshot) => {
                state.sales =
                    snapshotToSearchRecords(
                        snapshot
                    );
            },

            (error) => {
                console.error(
                    "Sell search listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );
            }
        );


    state.unsubscribePurchasesSearch =
        onSnapshot(
            collection(
                businessRef,
                "purchases"
            ),

            (snapshot) => {
                state.purchases =
                    snapshotToSearchRecords(
                        snapshot
                    );
            },

            (error) => {
                console.error(
                    "Buy search listener failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );
            }
        );
}




/* ============================================================
   AUTH
   ============================================================ */

async function handleUnauthorized() {
    cleanupListeners();

    try {
        await signOut(
            auth
        );
    } catch (error) {
        console.error(
            "Sign out failed:",
            error?.code ||
            error?.message ||
            "unknown-error"
        );
    }

    window.location.replace(
        "/login"
    );
}


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


            state.authenticated = true;


            const invoiceNumber =
                readSaleNumber();


            if (!invoiceNumber) {
                showError(
                    "No Sell invoice was selected."
                );

                return;
            }


            showLoading();


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


                /*
                 * Keep the actual Firestore ID internally.
                 *
                 * Receipts and payment history still use this ID.
                 */

                state.saleId =
                    resolvedSaleId;


                startSaleListener();

                startPaymentListener();

                startGlobalSearchListeners();

            } catch (error) {
                console.error(
                    "Sell invoice resolution failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );


                if (
                    error?.code ===
                    "permission-denied"
                ) {
                    await handleUnauthorized();

                    return;
                }


                showError(
                    "The Sell invoice could not be loaded."
                );
            }
        },

        () => {
            showError(
                "Unable to verify your session."
            );
        }
    );
}

/* ============================================================
   LOGOUT
   ============================================================ */

async function handleLogout() {
    cleanupListeners();

    try {
        await signOut(
            auth
        );
    } finally {
        window.location.replace(
            "/login"
        );
    }
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function toggleSidebar() {
    if (!elements.sidebar) {
        return;
    }


    const open =
        elements.sidebar.classList.toggle(
            "open"
        );


    elements.mobileMenuButton?.setAttribute(
        "aria-expanded",
        String(open)
    );
}


/* ============================================================
   GLOBAL SEARCH

   Full portal-wide search is already implemented on the
   dashboard/customer pages. For this detail page we keep the
   field safe and non-destructive until the shared search module
   is extracted.
   ============================================================ */
/* ============================================================
   GLOBAL SEARCH
   Same search behavior as Dashboard.
   ============================================================ */

function normalizeSearchText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function containsSearch(search, ...values) {
    return values.some((value) =>
        normalizeSearchText(value).includes(search)
    );
}


function getSearchSaleTotal(sale) {
    return safePaise(
        sale?.grandTotalPaise
    );
}


function getSearchSaleBalance(sale) {
    if (
        Number.isSafeInteger(
            sale?.balancePaise
        )
    ) {
        return sale.balancePaise;
    }

    return Math.max(
        0,
        getSearchSaleTotal(sale) -
        safePaise(sale?.receivedPaise)
    );
}


function getSearchPurchaseTotal(purchase) {
    return safePaise(
        purchase?.grandTotalPaise
    );
}


function getSearchPurchaseBalance(purchase) {
    if (
        Number.isSafeInteger(
            purchase?.balancePaise
        )
    ) {
        return purchase.balancePaise;
    }

    return Math.max(
        0,
        getSearchPurchaseTotal(purchase) -
        safePaise(purchase?.paidPaise)
    );
}


function getSearchSalePartyName(sale) {
    return (
        sale?.customerSnapshot?.name ||
        sale?.customer?.name ||
        sale?.billTo?.name ||
        "Customer"
    );
}


function getSearchPurchasePartyName(purchase) {
    return (
        purchase?.supplierSnapshot?.name ||
        purchase?.supplier?.name ||
        purchase?.billFrom?.name ||
        "Supplier"
    );
}


function getSearchStatus(
    transaction,
    balance,
    total,
    paidField
) {
    if (
        transaction?.status === "cancelled"
    ) {
        return "cancelled";
    }

    if (
        transaction?.status === "draft"
    ) {
        return "draft";
    }

    if (
        balance <= 0 &&
        total > 0
    ) {
        return "paid";
    }

    const dueDate =
        timestampToDate(
            transaction?.dueDate
        );

    if (
        balance > 0 &&
        dueDate
    ) {
        const endOfDueDate =
            new Date(dueDate);

        endOfDueDate.setHours(
            23,
            59,
            59,
            999
        );

        if (
            endOfDueDate.getTime() <
            Date.now()
        ) {
            return "overdue";
        }
    }

    if (
        safePaise(
            transaction?.[paidField]
        ) > 0
    ) {
        return "partially_paid";
    }

    return "pending";
}


function searchStatusLabel(status) {
    switch (status) {
        case "partially_paid":
            return "Partially Paid";

        case "paid":
            return "Paid";

        case "overdue":
            return "Overdue";

        case "draft":
            return "Draft";

        case "cancelled":
            return "Cancelled";

        default:
            return "Pending";
    }
}


/* ============================================================
   BUILD SEARCH RESULTS
   ============================================================ */

function buildSearchResults(searchText) {
    const search =
        normalizeSearchText(
            searchText
        );

    if (!search) {
        return [];
    }

    const results = [];


    /* --------------------------------------------------------
       CUSTOMERS
       -------------------------------------------------------- */

    state.customers.forEach(
        (customer) => {
            if (
                containsSearch(
                    search,
                    customer.name,
                    customer.mobile,
                    customer.email,
                    customer.gstin,
                    customer.address
                )
            ) {
                results.push({
                    type: "Customer",

                    title:
                        customer.name ||
                        "Customer",

                    subtitle:
                        customer.mobile ||
                        customer.email ||
                        "Customer record",

                    href:
                        customer.customerNumber
                            ? `/customers/${encodeURIComponent(
                                String(customer.customerNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/customers"
                });
            }
        }
    );


    /* --------------------------------------------------------
       SUPPLIERS
       -------------------------------------------------------- */

    state.suppliers.forEach(
        (supplier) => {
            if (
                containsSearch(
                    search,
                    supplier.name,
                    supplier.mobile,
                    supplier.email,
                    supplier.gstin,
                    supplier.address
                )
            ) {
                results.push({
                    type: "Supplier",

                    title:
                        supplier.name ||
                        "Supplier",

                    subtitle:
                        supplier.mobile ||
                        supplier.email ||
                        "Supplier record",

                    href:
                        supplier.supplierNumber
                            ? `/suppliers/${encodeURIComponent(
                                String(supplier.supplierNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/suppliers"
                });
            }
        }
    );


    /* --------------------------------------------------------
       SALES
       -------------------------------------------------------- */

    state.sales.forEach(
        (sale) => {
            const total =
                getSearchSaleTotal(
                    sale
                );

            const balance =
                getSearchSaleBalance(
                    sale
                );

            const status =
                getSearchStatus(
                    sale,
                    balance,
                    total,
                    "receivedPaise"
                );

            const party =
                getSearchSalePartyName(
                    sale
                );

            const customer =
                sale.customerSnapshot ||
                sale.customer ||
                sale.billTo ||
                {};


            if (
                containsSearch(
                    search,
                    sale.invoiceNumber,
                    party,
                    customer.mobile,
                    customer.email,
                    customer.gstin,
                    sale.saleType,
                    status,
                    searchStatusLabel(status),
                    formatMoney(total),
                    formatMoney(balance),
                    total / 100,
                    balance / 100
                )
            ) {
                results.push({
                    type: "Sell",

                    title:
                        sale.invoiceNumber ||
                        "Sale",

                    subtitle:
                        `${party} · ` +
                        `${formatMoney(total)} · ` +
                        `${searchStatusLabel(status)}`,

                    href:
                        sale.invoiceNumber
                            ? `/sales/${encodeURIComponent(
                                String(sale.invoiceNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/sales"
                });
            }
        }
    );


    /* --------------------------------------------------------
       PURCHASES
       -------------------------------------------------------- */

    state.purchases.forEach(
        (purchase) => {
            const total =
                getSearchPurchaseTotal(
                    purchase
                );

            const balance =
                getSearchPurchaseBalance(
                    purchase
                );

            const status =
                getSearchStatus(
                    purchase,
                    balance,
                    total,
                    "paidPaise"
                );

            const party =
                getSearchPurchasePartyName(
                    purchase
                );

            const supplier =
                purchase.supplierSnapshot ||
                purchase.supplier ||
                purchase.billFrom ||
                {};


            if (
                containsSearch(
                    search,
                    purchase.purchaseNumber,
                    purchase.supplierInvoiceNumber,
                    party,
                    supplier.mobile,
                    supplier.email,
                    supplier.gstin,
                    purchase.purchaseType,
                    status,
                    searchStatusLabel(status),
                    formatMoney(total),
                    formatMoney(balance),
                    total / 100,
                    balance / 100
                )
            ) {
                results.push({
                    type: "Buy",

                    title:
                        purchase.purchaseNumber ||
                        "Purchase",

                    subtitle:
                        `${party} · ` +
                        `${formatMoney(total)} · ` +
                        `${searchStatusLabel(status)}`,

                    href:
                        purchase.purchaseNumber
                            ? `/purchases/${encodeURIComponent(
                                String(purchase.purchaseNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/purchases"
                });
            }
        }
    );


    return results.slice(
        0,
        MAX_SEARCH_RESULTS
    );
}


/* ============================================================
   HIDE SEARCH RESULTS
   ============================================================ */

function hideSearchResults() {
    if (
        elements.globalSearchResults
    ) {
        elements.globalSearchResults.hidden =
            true;
    }
}


/* ============================================================
   RENDER SEARCH RESULTS
   ============================================================ */

function renderSearchResults(searchText) {
    const container =
        elements.globalSearchResults;

    const content =
        elements.globalSearchResultsContent;

    if (
        !container ||
        !content
    ) {
        return;
    }


    content.replaceChildren();


    const search =
        normalizeSearchText(
            searchText
        );


    if (!search) {
        container.hidden =
            true;

        return;
    }


    const results =
        buildSearchResults(
            search
        );


    if (
        results.length === 0
    ) {
        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "search-result-empty";

        empty.textContent =
            "No matching customers, suppliers, Sell or Buy records.";

        content.appendChild(
            empty
        );

        container.hidden =
            false;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    results.forEach(
        (result) => {
            const link =
                document.createElement(
                    "a"
                );

            link.className =
                "search-result-item";

            link.href =
                result.href;


            const information =
                document.createElement(
                    "div"
                );

            information.className =
                "search-result-content";


            const title =
                document.createElement(
                    "strong"
                );

            title.textContent =
                result.title;


            const subtitle =
                document.createElement(
                    "span"
                );

            subtitle.textContent =
                result.subtitle;


            information.append(
                title,
                subtitle
            );


            const type =
                document.createElement(
                    "span"
                );

            type.className =
                "search-result-type";

            type.textContent =
                result.type;


            link.append(
                information,
                type
            );


            fragment.appendChild(
                link
            );
        }
    );


    content.appendChild(
        fragment
    );

    container.hidden =
        false;
}


/* ============================================================
   SEARCH EVENTS
   ============================================================ */

function handleGlobalSearchInput() {
    renderSearchResults(
        elements.globalSearchInput
            ?.value || ""
    );
}


function handleGlobalSearchFocus() {
    const value =
        elements.globalSearchInput
            ?.value || "";

    if (
        value.trim()
    ) {
        renderSearchResults(
            value
        );
    }
}


function handleGlobalSearchKeyDown(
    event
) {
    if (
        event.key === "Escape"
    ) {
        hideSearchResults();

        elements.globalSearchInput
            ?.blur();
    }
}


function handleGlobalSearchDocumentClick(
    event
) {
    const search =
        document.querySelector(
            ".global-search"
        );

    if (
        search &&
        !search.contains(
            event.target
        )
    ) {
        hideSearchResults();
    }
}


/* ============================================================
   MODAL BACKDROP / ESCAPE
   ============================================================ */

function handleModalBackdrop(event) {
    if (
        event.target ===
        elements.receiptModal
    ) {
        closeReceiptModal();
    }
}


function handleKeyDown(event) {
    if (
        event.key === "Escape" &&
        !elements.receiptModal.hidden
    ) {
        closeReceiptModal();
    }
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanupListeners() {
    if (
        typeof state.unsubscribeSale ===
        "function"
    ) {
        state.unsubscribeSale();

        state.unsubscribeSale =
            null;
    }


    if (
        typeof state.unsubscribePayments ===
        "function"
    ) {
        state.unsubscribePayments();

        state.unsubscribePayments =
            null;
    }


    if (
    typeof state.unsubscribeCustomers ===
    "function"
    ) {
        state.unsubscribeCustomers();
        state.unsubscribeCustomers = null;
    }


    if (
        typeof state.unsubscribeSuppliers ===
        "function"
    ) {
        state.unsubscribeSuppliers();
        state.unsubscribeSuppliers = null;
    }


    if (
        typeof state.unsubscribeSalesSearch ===
        "function"
    ) {
        state.unsubscribeSalesSearch();
        state.unsubscribeSalesSearch = null;
    }


    if (
        typeof state.unsubscribePurchasesSearch ===
        "function"
    ) {
        state.unsubscribePurchasesSearch();
        state.unsubscribePurchasesSearch = null;
    }



}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {
    elements.mobileMenuButton?.addEventListener(
        "click",
        toggleSidebar
    );


    elements.logoutButton?.addEventListener(
        "click",
        handleLogout
    );


    elements.printInvoiceButton?.addEventListener(
        "click",
        handlePrint
    );


    elements.duplicateInvoiceButton?.addEventListener(
        "click",
        handleDuplicate
    );


    elements.recordReceiptButton?.addEventListener(
        "click",
        openReceiptModal
    );


    elements.historyRecordReceiptButton?.addEventListener(
        "click",
        openReceiptModal
    );


    elements.closeReceiptModalButton?.addEventListener(
        "click",
        closeReceiptModal
    );


    elements.cancelReceiptButton?.addEventListener(
        "click",
        closeReceiptModal
    );


    elements.receiptForm?.addEventListener(
        "submit",
        handleReceiptSubmit
    );


    elements.receiptModal?.addEventListener(
        "click",
        handleModalBackdrop
    );


    elements.globalSearchInput?.addEventListener(
        "input",
        handleGlobalSearchInput
    );



    elements.globalSearchInput?.addEventListener(
    "focus",
    handleGlobalSearchFocus
    );


    elements.globalSearchInput?.addEventListener(
        "keydown",
        handleGlobalSearchKeyDown
    );


    document.addEventListener(
        "click",
        handleGlobalSearchDocumentClick
    );


    document.addEventListener(
        "keydown",
        handleKeyDown
    );


    window.addEventListener(
        "beforeunload",
        cleanupListeners
    );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initialize() {
    renderCurrentDate();

    bindEvents();

    showLoading();

    startAuth();
}


initialize();