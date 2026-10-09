/* ============================================================
   OM MARUTI DIAMOND
   PURCHASE / BUY DETAIL PAGE
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
   CONFIG
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";

const MAX_SEARCH_RESULTS =
    12;


/* ============================================================
   STATE
   ============================================================ */

const state = {
    authenticated: false,

    purchaseId: null,
    purchase: null,

    payments: [],

    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],

    paymentSubmitting: false,

    unsubscribePurchase: null,
    unsubscribePayments: null,
    unsubscribeCustomers: null,
    unsubscribeSuppliers: null,
    unsubscribeSales: null,
    unsubscribePurchases: null
};


/* ============================================================
   ELEMENTS
   ============================================================ */

const elements = {
    sidebar:
        document.getElementById(
            "sidebar"
        ),

    sidebarOverlay:
        document.getElementById(
            "sidebarOverlay"
        ),

    mobileMenuButton:
        document.getElementById(
            "mobileMenuButton"
        ),

    logoutButton:
        document.getElementById(
            "logoutButton"
        ),

    currentDate:
        document.getElementById(
            "currentDate"
        ),


    /* SEARCH */

    globalSearchInput:
        document.getElementById(
            "globalSearchInput"
        ),

    globalSearchResults:
        document.getElementById(
            "globalSearchResults"
        ),

    globalSearchResultsContent:
        document.getElementById(
            "globalSearchResultsContent"
        ),


    /* STATES */

    purchaseLoadingState:
        document.getElementById(
            "purchaseLoadingState"
        ),

    purchaseErrorState:
        document.getElementById(
            "purchaseErrorState"
        ),

    purchaseErrorMessage:
        document.getElementById(
            "purchaseErrorMessage"
        ),

    purchaseContent:
        document.getElementById(
            "purchaseContent"
        ),


    /* HEADER */

    purchaseNumber:
        document.getElementById(
            "purchaseNumber"
        ),

    purchaseStatus:
        document.getElementById(
            "purchaseStatus"
        ),

    purchaseHeadingText:
        document.getElementById(
            "purchaseHeadingText"
        ),

    printInvoiceButton:
        document.getElementById(
            "printInvoiceButton"
        ),

    headingPrintInvoiceButton:
        document.getElementById(
            "headingPrintInvoiceButton"
        ),

    recordPaymentButton:
        document.getElementById(
            "recordPaymentButton"
        ),


    /* SUMMARY */

    purchaseGrandTotal:
        document.getElementById(
            "purchaseGrandTotal"
        ),

    purchasePaid:
        document.getElementById(
            "purchasePaid"
        ),

    purchaseBalance:
        document.getElementById(
            "purchaseBalance"
        ),

    purchaseDueDateSummary:
        document.getElementById(
            "purchaseDueDateSummary"
        ),


    /* PURCHASE DETAILS */

    purchaseNumberDetail:
        document.getElementById(
            "purchaseNumberDetail"
        ),

    supplierInvoiceNumber:
        document.getElementById(
            "supplierInvoiceNumber"
        ),

    purchaseDate:
        document.getElementById(
            "purchaseDate"
        ),

    purchaseType:
        document.getElementById(
            "purchaseType"
        ),

    purchaseDueDateRow:
        document.getElementById(
            "purchaseDueDateRow"
        ),

    purchaseDueDate:
        document.getElementById(
            "purchaseDueDate"
        ),

    purchaseBroker:
        document.getElementById(
            "purchaseBroker"
        ),


    /* SUPPLIER */

    supplierName:
        document.getElementById(
            "supplierName"
        ),

    supplierMobile:
        document.getElementById(
            "supplierMobile"
        ),

    supplierEmail:
        document.getElementById(
            "supplierEmail"
        ),

    supplierGstin:
        document.getElementById(
            "supplierGstin"
        ),

    supplierAddress:
        document.getElementById(
            "supplierAddress"
        ),

    viewSupplierButton:
        document.getElementById(
            "viewSupplierButton"
        ),


    /* ITEMS */

    purchaseItemsBody:
        document.getElementById(
            "purchaseItemsBody"
        ),

    itemsTotalPieces:
        document.getElementById(
            "itemsTotalPieces"
        ),

    itemsTotalCarat:
        document.getElementById(
            "itemsTotalCarat"
        ),

    itemsTotalAmount:
        document.getElementById(
            "itemsTotalAmount"
        ),

    itemsTotalTax:
        document.getElementById(
            "itemsTotalTax"
        ),

    itemsGrandLineTotal:
        document.getElementById(
            "itemsGrandLineTotal"
        ),


    /* TOTALS */

    purchaseSubtotal:
        document.getElementById(
            "purchaseSubtotal"
        ),

    purchaseTax:
        document.getElementById(
            "purchaseTax"
        ),

    purchaseDiscount:
        document.getElementById(
            "purchaseDiscount"
        ),

    purchaseCharges:
        document.getElementById(
            "purchaseCharges"
        ),

    purchaseRoundOff:
        document.getElementById(
            "purchaseRoundOff"
        ),

    purchaseGrandTotalDetail:
        document.getElementById(
            "purchaseGrandTotalDetail"
        ),

    purchasePaidDetail:
        document.getElementById(
            "purchasePaidDetail"
        ),

    purchaseBalanceDetail:
        document.getElementById(
            "purchaseBalanceDetail"
        ),

    purchaseAmountWords:
        document.getElementById(
            "purchaseAmountWords"
        ),

    purchaseNotes:
        document.getElementById(
            "purchaseNotes"
        ),

    purchaseDeclaration:
        document.getElementById(
            "purchaseDeclaration"
        ),


    /* PAYMENT HISTORY */

    paymentHistoryAddButton:
        document.getElementById(
            "paymentHistoryAddButton"
        ),

    purchasePaymentsEmpty:
        document.getElementById(
            "purchasePaymentsEmpty"
        ),

    purchasePaymentsTableWrap:
        document.getElementById(
            "purchasePaymentsTableWrap"
        ),

    purchasePaymentsBody:
        document.getElementById(
            "purchasePaymentsBody"
        ),


    /* PAYMENT MODAL */

    paymentModal:
        document.getElementById(
            "paymentModal"
        ),

    closePaymentModalButton:
        document.getElementById(
            "closePaymentModalButton"
        ),

    cancelPaymentButton:
        document.getElementById(
            "cancelPaymentButton"
        ),

    paymentModalPurchaseNumber:
        document.getElementById(
            "paymentModalPurchaseNumber"
        ),

    paymentModalBalance:
        document.getElementById(
            "paymentModalBalance"
        ),

    paymentForm:
        document.getElementById(
            "paymentForm"
        ),

    paymentAmount:
        document.getElementById(
            "paymentAmount"
        ),

    paymentAmountError:
        document.getElementById(
            "paymentAmountError"
        ),

    paymentDate:
        document.getElementById(
            "paymentDate"
        ),

    paymentDateError:
        document.getElementById(
            "paymentDateError"
        ),

    paymentMethod:
        document.getElementById(
            "paymentMethod"
        ),

    paymentReference:
        document.getElementById(
            "paymentReference"
        ),

    paymentNote:
        document.getElementById(
            "paymentNote"
        ),

    paymentFormMessage:
        document.getElementById(
            "paymentFormMessage"
        ),

    savePaymentButton:
        document.getElementById(
            "savePaymentButton"
        ),

    savePaymentButtonText:
        document.getElementById(
            "savePaymentButtonText"
        ),

    savePaymentSpinner:
        document.getElementById(
            "savePaymentSpinner"
        ),


    /* MOBILE */

    mobileNewTransactionButton:
        document.getElementById(
            "mobileNewTransactionButton"
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


function safePaise(value) {
    return Number.isSafeInteger(
        value
    )
        ? value
        : 0;
}


function createElement(
    tagName,
    className = "",
    content = ""
) {
    const element =
        document.createElement(
            tagName
        );

    if (className) {
        element.className =
            className;
    }

    if (
        content !== undefined &&
        content !== null &&
        content !== ""
    ) {
        element.textContent =
            text(content);
    }

    return element;
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
            "purchases"
    ) {
        return text(
            parts[1]
        )
            .trim()
            .toUpperCase();
    }

    return "";
}


async function resolvePurchaseIdByNumber(
    purchaseNumber
) {
    const cleanedPurchaseNumber =
        text(
            purchaseNumber
        )
            .trim()
            .toUpperCase();

    if (
        !cleanedPurchaseNumber
    ) {
        return "";
    }

    const purchaseQuery =
        query(
            businessCollection(
                "purchases"
            ),

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
   URL ACTION
   ============================================================ */

function readPageAction() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return String(
        params.get("action") || ""
    )
        .trim()
        .toLowerCase();
}


let paymentActionHandled =
    false;


function handleRequestedPageAction() {

    if (
        paymentActionHandled
    ) {
        return;
    }


    if (
        readPageAction() !==
        "payment"
    ) {
        return;
    }


    if (
        !state.purchase
    ) {
        return;
    }


    /*
     * Do not open payment UI for a purchase
     * with no outstanding balance.
     */

    const balancePaise =
        Math.max(
            0,
            Number(
                state.purchase.balancePaise ||
                0
            )
        );


    if (
        balancePaise <= 0
    ) {
        return;
    }


    paymentActionHandled =
        true;


    /*
     * IMPORTANT:
     * Replace this name only if your existing
     * purchase.js uses a different modal function.
     */

    openPaymentModal();


    /*
     * Remove action=payment from the URL.
     *
     * Refreshing the page will therefore not
     * repeatedly reopen the modal.
     */

    const url =
        new URL(
            window.location.href
        );


    url.searchParams.delete(
        "action"
    );


    window.history.replaceState(
        {},
        "",
        url
    );
}


/* ============================================================
   MONEY
   ============================================================ */

function formatMoney(paise) {
    const safe =
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
        safe / 100
    );
}


function parseMoneyToPaise(
    value
) {
    const raw =
        text(value)
            .replace(/,/g, "")
            .trim();

    if (!raw) {
        return 0;
    }

    if (
        !/^\d+(?:\.\d{0,2})?$/.test(
            raw
        )
    ) {
        return null;
    }

    const amount =
        Number(raw);

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        return null;
    }

    const paise =
        Math.round(
            amount * 100
        );

    return Number.isSafeInteger(
        paise
    )
        ? paise
        : null;
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function localDateKey(date) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}


function todayDateKey() {
    return localDateKey(
        new Date()
    );
}


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
        const match =
            value.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

        if (match) {
            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );
        }

        const parsed =
            new Date(value);

        return Number.isNaN(
            parsed.getTime()
        )
            ? null
            : parsed;
    }

    if (
        typeof value ===
        "number"
    ) {
        const parsed =
            new Date(value);

        return Number.isNaN(
            parsed.getTime()
        )
            ? null
            : parsed;
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


function renderCurrentDate() {
    if (!elements.currentDate) {
        return;
    }

    elements.currentDate.textContent =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric"
            }
        ).format(
            new Date()
        );
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
        Math.floor(number);

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
            Math.abs(number)
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


function amountToWords(paise) {
    const safe =
        Math.max(
            0,
            Math.round(
                Number(paise) || 0
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
   FIRESTORE
   ============================================================ */

function businessCollection(
    name
) {
    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        name
    );
}


function businessDocument(
    collectionName,
    documentId
) {
    return doc(
        db,
        "businesses",
        BUSINESS_ID,
        collectionName,
        documentId
    );
}


function snapshotToRecords(
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


/* ============================================================
   PAYMENT TOTALS
   ============================================================ */

function calculateRecordedPaid() {
    return state.payments.reduce(
        (
            total,
            payment
        ) => {
            return (
                total +
                Math.max(
                    0,
                    safePaise(
                        payment.amountPaise
                    )
                )
            );
        },
        0
    );
}


function getPurchaseFinancials() {
    const purchase =
        state.purchase || {};

    const grandTotalPaise =
        Math.max(
            0,
            safePaise(
                purchase
                    .grandTotalPaise
            )
        );

    /*
     * purchasePayments is the detailed ledger.
     * The purchase document also stores authoritative
     * paid/balance totals.
     *
     * Prefer purchase totals when available so the
     * page reflects the backend transaction immediately.
     */

    let paidPaise =
        safePaise(
            purchase.paidPaise
        );

    if (
        !Number.isSafeInteger(
            purchase.paidPaise
        )
    ) {
        paidPaise =
            calculateRecordedPaid();
    }

    paidPaise =
        Math.max(
            0,
            Math.min(
                paidPaise,
                grandTotalPaise
            )
        );

    let balancePaise =
        safePaise(
            purchase.balancePaise
        );

    if (
        !Number.isSafeInteger(
            purchase.balancePaise
        )
    ) {
        balancePaise =
            Math.max(
                0,
                grandTotalPaise -
                paidPaise
            );
    }

    balancePaise =
        Math.max(
            0,
            balancePaise
        );

    return {
        grandTotalPaise,
        paidPaise,
        balancePaise
    };
}


/* ============================================================
   PURCHASE STATUS
   ============================================================ */

function getPurchaseStatus() {
    const purchase =
        state.purchase;

    if (!purchase) {
        return {
            key:
                "pending",

            label:
                "Pending"
        };
    }

    if (
        purchase.status ===
        "draft"
    ) {
        return {
            key:
                "draft",

            label:
                "Draft"
        };
    }

    if (
        purchase.status ===
        "cancelled"
    ) {
        return {
            key:
                "cancelled",

            label:
                "Cancelled"
        };
    }

    const {
        grandTotalPaise,
        paidPaise,
        balancePaise
    } =
        getPurchaseFinancials();

    if (
        grandTotalPaise > 0 &&
        balancePaise <= 0
    ) {
        return {
            key:
                "paid",

            label:
                "Paid"
        };
    }

    if (
        paidPaise > 0 &&
        balancePaise > 0
    ) {
        return {
            key:
                "partially_paid",

            label:
                "Partially Paid"
        };
    }

    const dueDate =
        timestampToDate(
            purchase.dueDate
        );

    if (
        purchase.purchaseType ===
            "credit" &&
        balancePaise > 0 &&
        dueDate
    ) {
        const dueKey =
            localDateKey(
                dueDate
            );

        if (
            dueKey <
            todayDateKey()
        ) {
            return {
                key:
                    "overdue",

                label:
                    "Overdue"
            };
        }
    }

    return {
        key:
            "pending",

        label:
            "Unpaid"
    };
}


/* ============================================================
   SUPPLIER SNAPSHOT
   ============================================================ */

function findSupplier(
    supplierId
) {
    return state.suppliers.find(
        (supplier) =>
            supplier.id ===
            supplierId
    ) || null;
}


function getSupplierSnapshot() {
    const purchase =
        state.purchase || {};

    const snapshot =
        purchase.supplierSnapshot ||
        purchase.supplier ||
        purchase.vendorSnapshot ||
        {};

    const liveSupplier =
        findSupplier(
            purchase.supplierId
        ) || {};

    return {
        name:
            text(
                snapshot.name ||
                snapshot.businessName ||
                liveSupplier.name ||
                liveSupplier.businessName
            ).trim(),

        mobile:
            text(
                snapshot.mobile ||
                liveSupplier.mobile
            ).trim(),

        email:
            text(
                snapshot.email ||
                liveSupplier.email
            ).trim(),

        gstin:
            text(
                snapshot.gstin ||
                liveSupplier.gstin
            ).trim(),

        address:
            text(
                snapshot.address ||
                liveSupplier.address
            ).trim()
    };
}


/* ============================================================
   ITEM HELPERS
   ============================================================ */

function normalizeItemNumber(
    value
) {
    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : 0;
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
        safePaise(
            item.taxPaise
        )
    );
}


/* ============================================================
   RENDER ITEMS
   ============================================================ */

function renderItems() {
    const purchase =
        state.purchase;

    if (
        !purchase ||
        !elements.purchaseItemsBody
    ) {
        return;
    }

    elements.purchaseItemsBody
        .replaceChildren();

    const items =
        Array.isArray(
            purchase.items
        )
            ? purchase.items
            : [];

    let totalPieces = 0;
    let totalCarat = 0;
    let totalAmountPaise = 0;
    let totalTaxPaise = 0;
    let totalPaise = 0;

    const fragment =
        document.createDocumentFragment();

    items.forEach(
        (item, index) => {
            const row =
                document.createElement(
                    "tr"
                );

            const pieces =
                normalizeItemNumber(
                    item.pieces
                );

            const carat =
                normalizeItemNumber(
                    item.carat
                );

            const taxablePaise =
                getItemTaxablePaise(
                    item
                );

            const taxPaise =
                safePaise(
                    item.taxPaise
                );

            const lineTotalPaise =
                getItemTotalPaise(
                    item
                );

            totalPieces +=
                pieces;

            totalCarat +=
                carat;

            totalAmountPaise +=
                taxablePaise;

            totalTaxPaise +=
                taxPaise;

            totalPaise +=
                lineTotalPaise;


            const values = [
                String(
                    index + 1
                ),

                text(
                    item.material
                ).trim() ||
                "—",

                text(
                    item.description
                ).trim() ||
                "—",

                text(
                    item.remarks
                ).trim() ||
                "—",

                text(
                    item.hsn
                ).trim() ||
                "—",

                String(
                    pieces
                ),

                carat.toFixed(
                    3
                ),

                formatMoney(
                    safePaise(
                        item.ratePaise
                    )
                ),

                `${normalizeItemNumber(
                    item.discountPercent
                )}%`,

                formatMoney(
                    taxablePaise
                ),

                `${normalizeItemNumber(
                    item.taxPercent
                )}%`,

                formatMoney(
                    taxPaise
                ),

                formatMoney(
                    lineTotalPaise
                )
            ];

            values.forEach(
                (value) => {
                    const cell =
                        document.createElement(
                            "td"
                        );

                    cell.textContent =
                        value;

                    row.appendChild(
                        cell
                    );
                }
            );

            fragment.appendChild(
                row
            );
        }
    );

    elements.purchaseItemsBody
        .appendChild(
            fragment
        );

    if (
        elements.itemsTotalPieces
    ) {
        elements.itemsTotalPieces
            .textContent =
            String(
                totalPieces
            );
    }

    if (
        elements.itemsTotalCarat
    ) {
        elements.itemsTotalCarat
            .textContent =
            totalCarat.toFixed(
                3
            );
    }

    if (
        elements.itemsTotalAmount
    ) {
        elements.itemsTotalAmount
            .textContent =
            formatMoney(
                totalAmountPaise
            );
    }

    if (
        elements.itemsTotalTax
    ) {
        elements.itemsTotalTax
            .textContent =
            formatMoney(
                totalTaxPaise
            );
    }

    if (
        elements.itemsGrandLineTotal
    ) {
        elements.itemsGrandLineTotal
            .textContent =
            formatMoney(
                totalPaise
            );
    }
}


/* ============================================================
   RENDER PURCHASE
   ============================================================ */

function renderPurchase() {
    const purchase =
        state.purchase;

    if (!purchase) {
        return;
    }

    const supplier =
        getSupplierSnapshot();

    const {
        grandTotalPaise,
        paidPaise,
        balancePaise
    } =
        getPurchaseFinancials();

    const status =
        getPurchaseStatus();

    const purchaseNumber =
        text(
            purchase.purchaseNumber
        ).trim() ||
        "Buy";

    const isCredit =
        purchase.purchaseType ===
        "credit";


    /* PAGE TITLE */

    document.title =
        `${purchaseNumber} | OM MARUTI DIAMOND`;


    /* HEADING */

    if (
        elements.purchaseNumber
    ) {
        elements.purchaseNumber
            .textContent =
            purchaseNumber;
    }

    if (
        elements.purchaseStatus
    ) {
        elements.purchaseStatus
            .textContent =
            status.label;

        elements.purchaseStatus
            .dataset.status =
            status.key;
    }

    if (
        elements.purchaseHeadingText
    ) {
        elements.purchaseHeadingText
            .textContent =
            supplier.name
                ? `Buy from ${supplier.name}`
                : "Purchase details and supplier payment history.";
    }


    /* SUMMARY */

    if (
        elements.purchaseGrandTotal
    ) {
        elements.purchaseGrandTotal
            .textContent =
            formatMoney(
                grandTotalPaise
            );
    }

    if (
        elements.purchasePaid
    ) {
        elements.purchasePaid
            .textContent =
            formatMoney(
                paidPaise
            );
    }

    if (
        elements.purchaseBalance
    ) {
        elements.purchaseBalance
            .textContent =
            formatMoney(
                balancePaise
            );
    }

    if (
        elements.purchaseDueDateSummary
    ) {
        elements.purchaseDueDateSummary
            .textContent =
            isCredit
                ? formatDate(
                    purchase.dueDate
                )
                : "—";
    }


    /* PURCHASE DETAILS */

    if (
        elements.purchaseNumberDetail
    ) {
        elements.purchaseNumberDetail
            .textContent =
            purchaseNumber;
    }

    if (
        elements.supplierInvoiceNumber
    ) {
        elements.supplierInvoiceNumber
            .textContent =
            text(
                purchase
                    .supplierInvoiceNumber
            ).trim() ||
            "—";
    }

    if (
        elements.purchaseDate
    ) {
        elements.purchaseDate
            .textContent =
            formatDate(
                purchase.purchaseDate
            );
    }

    if (
        elements.purchaseType
    ) {
        elements.purchaseType
            .textContent =
            isCredit
                ? "Credit Buy"
                : "Cash Buy";
    }

    if (
        elements.purchaseDueDateRow
    ) {
        elements.purchaseDueDateRow
            .hidden =
            !isCredit;
    }

    if (
        elements.purchaseDueDate
    ) {
        elements.purchaseDueDate
            .textContent =
            isCredit
                ? formatDate(
                    purchase.dueDate
                )
                : "—";
    }

    if (
        elements.purchaseBroker
    ) {
        elements.purchaseBroker
            .textContent =
            text(
                purchase.broker
            ).trim() ||
            "—";
    }


    /* SUPPLIER */

    if (
        elements.supplierName
    ) {
        elements.supplierName
            .textContent =
            supplier.name ||
            "—";
    }

    if (
        elements.supplierMobile
    ) {
        elements.supplierMobile
            .textContent =
            supplier.mobile ||
            "—";
    }

    if (
        elements.supplierEmail
    ) {
        elements.supplierEmail
            .textContent =
            supplier.email ||
            "—";
    }

    if (
        elements.supplierGstin
    ) {
        elements.supplierGstin
            .textContent =
            supplier.gstin ||
            "—";
    }

    if (
        elements.supplierAddress
    ) {
        elements.supplierAddress
            .textContent =
            supplier.address ||
            "—";
    }

    if (
        elements.viewSupplierButton
    ) {
        const linkedSupplier =
    state.suppliers.find(
        (supplier) =>
            supplier.id ===
            purchase.supplierId
    ) || null;

        const supplierNumber =
            text(
                linkedSupplier?.supplierNumber ||
                purchase.supplierSnapshot
                    ?.supplierNumber
            )
                .trim()
                .toUpperCase();

        if (
            supplierNumber
        ) {
            elements.viewSupplierButton
                .href =
                `/suppliers/${encodeURIComponent(
                    supplierNumber
                )}`;

            elements.viewSupplierButton
                .hidden =
                false;
        } else {
            elements.viewSupplierButton
                .hidden =
                true;
        }
    }


    /* TOTALS */

    const subtotalPaise =
        safePaise(
            purchase.subtotalPaise
        );

    const taxPaise =
        safePaise(
            purchase.taxPaise
        );

    const discountPaise =
        safePaise(
            purchase.discountPaise
        );

    const chargesPaise =
        safePaise(
            purchase.chargesPaise
        );

    const roundOffPaise =
        safePaise(
            purchase.roundOffPaise
        );

    if (
        elements.purchaseSubtotal
    ) {
        elements.purchaseSubtotal
            .textContent =
            formatMoney(
                subtotalPaise
            );
    }

    if (
        elements.purchaseTax
    ) {
        elements.purchaseTax
            .textContent =
            formatMoney(
                taxPaise
            );
    }

    if (
        elements.purchaseDiscount
    ) {
        elements.purchaseDiscount
            .textContent =
            `− ${formatMoney(
                discountPaise
            )}`;
    }

    if (
        elements.purchaseCharges
    ) {
        elements.purchaseCharges
            .textContent =
            formatMoney(
                chargesPaise
            );
    }

    if (
        elements.purchaseRoundOff
    ) {
        elements.purchaseRoundOff
            .textContent =
            formatMoney(
                roundOffPaise
            );
    }

    if (
        elements.purchaseGrandTotalDetail
    ) {
        elements.purchaseGrandTotalDetail
            .textContent =
            formatMoney(
                grandTotalPaise
            );
    }

    if (
        elements.purchasePaidDetail
    ) {
        elements.purchasePaidDetail
            .textContent =
            formatMoney(
                paidPaise
            );
    }

    if (
        elements.purchaseBalanceDetail
    ) {
        elements.purchaseBalanceDetail
            .textContent =
            formatMoney(
                balancePaise
            );
    }

    if (
        elements.purchaseAmountWords
    ) {
        elements.purchaseAmountWords
            .textContent =
            amountToWords(
                grandTotalPaise
            );
    }


    /* NOTES */

    if (
        elements.purchaseNotes
    ) {
        elements.purchaseNotes
            .textContent =
            text(
                purchase.notes
            ).trim() ||
            "—";
    }

    if (
        elements.purchaseDeclaration
    ) {
        elements.purchaseDeclaration
            .textContent =
            text(
                purchase.declaration
            ).trim() ||
            "—";
    }


    /* ACTIONS */

    const canRecordPayment =
        purchase.status !==
            "draft" &&
        purchase.status !==
            "cancelled" &&
        balancePaise > 0;

    if (
        elements.recordPaymentButton
    ) {
        elements.recordPaymentButton
            .hidden =
            !canRecordPayment;
    }

    if (
        elements.paymentHistoryAddButton
    ) {
        elements.paymentHistoryAddButton
            .hidden =
            !canRecordPayment;
    }

    if (
        elements.printInvoiceButton
    ) {
        elements.printInvoiceButton
            .disabled =
            false;
    }


    renderItems();

    renderPayments();

    renderPaymentModalSummary();
}


/* ============================================================
   PAYMENT HISTORY
   ============================================================ */

function paymentMethodLabel(
    method
) {
    switch (
        text(method)
            .trim()
            .toLowerCase()
    ) {
        case "cash":
            return "Cash";

        case "bank":
            return "Bank Transfer";

        case "upi":
            return "UPI";

        case "cheque":
            return "Cheque";

        case "other":
            return "Other";

        default:
            return (
                text(method)
                    .trim() ||
                "—"
            );
    }
}


function renderPayments() {
    if (
        !elements.purchasePaymentsBody
    ) {
        return;
    }

    elements.purchasePaymentsBody
        .replaceChildren();

    const payments =
        [...state.payments];

    if (
        payments.length === 0
    ) {
        if (
            elements.purchasePaymentsEmpty
        ) {
            elements.purchasePaymentsEmpty
                .hidden =
                false;
        }

        if (
            elements.purchasePaymentsTableWrap
        ) {
            elements.purchasePaymentsTableWrap
                .hidden =
                true;
        }

        return;
    }

    if (
        elements.purchasePaymentsEmpty
    ) {
        elements.purchasePaymentsEmpty
            .hidden =
            true;
    }

    if (
        elements.purchasePaymentsTableWrap
    ) {
        elements.purchasePaymentsTableWrap
            .hidden =
            false;
    }

    const fragment =
        document.createDocumentFragment();

    payments.forEach(
        (payment) => {
            const row =
                document.createElement(
                    "tr"
                );

            const values = [
                formatDate(
                    payment.paymentDate
                ),

                paymentMethodLabel(
                    payment.method
                ),

                text(
                    payment.reference
                ).trim() ||
                "—",

                text(
                    payment.note
                ).trim() ||
                "—",

                formatMoney(
                    safePaise(
                        payment.amountPaise
                    )
                )
            ];

            values.forEach(
                (
                    value,
                    index
                ) => {
                    const cell =
                        document.createElement(
                            "td"
                        );

                    cell.textContent =
                        value;

                    if (
                        index === 4
                    ) {
                        cell.className =
                            "sale-payment-amount";
                    }

                    row.appendChild(
                        cell
                    );
                }
            );

            fragment.appendChild(
                row
            );
        }
    );

    elements.purchasePaymentsBody
        .appendChild(
            fragment
        );
}


/* ============================================================
   PAGE STATES
   ============================================================ */

function showLoadingState() {
    if (
        elements.purchaseLoadingState
    ) {
        elements.purchaseLoadingState
            .hidden =
            false;
    }

    if (
        elements.purchaseErrorState
    ) {
        elements.purchaseErrorState
            .hidden =
            true;
    }

    if (
        elements.purchaseContent
    ) {
        elements.purchaseContent
            .hidden =
            true;
    }
}


function showPurchaseContent() {
    if (
        elements.purchaseLoadingState
    ) {
        elements.purchaseLoadingState
            .hidden =
            true;
    }

    if (
        elements.purchaseErrorState
    ) {
        elements.purchaseErrorState
            .hidden =
            true;
    }

    if (
        elements.purchaseContent
    ) {
        elements.purchaseContent
            .hidden =
            false;
    }
}


function showPurchaseError(
    message
) {
    if (
        elements.purchaseLoadingState
    ) {
        elements.purchaseLoadingState
            .hidden =
            true;
    }

    if (
        elements.purchaseContent
    ) {
        elements.purchaseContent
            .hidden =
            true;
    }

    if (
        elements.purchaseErrorState
    ) {
        elements.purchaseErrorState
            .hidden =
            false;
    }

    if (
        elements.purchaseErrorMessage
    ) {
        elements.purchaseErrorMessage
            .textContent =
            message;
    }
}


/* ============================================================
   PURCHASE LISTENER
   ============================================================ */

function startPurchaseListener() {
    if (
        !state.purchaseId
    ) {
        showPurchaseError(
            "No purchase ID was provided."
        );

        return;
    }

    if (
        state.unsubscribePurchase
    ) {
        state.unsubscribePurchase();
    }

    const purchaseRef =
        businessDocument(
            "purchases",
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

                    showPurchaseError(
                        "This Buy purchase does not exist or is no longer available."
                    );

                    return;
                }

                state.purchase = {
                    id:
                        snapshot.id,

                    ...snapshot.data()
                };

                showPurchaseContent();

                renderPurchase();
            },

            (error) => {
                console.error(
                    "Purchase listener failed:",
                    error
                );

                showPurchaseError(
                    "Unable to load this Buy purchase."
                );
            }
        );
}


/* ============================================================
   PAYMENT LISTENER
   ============================================================ */

function startPaymentListener() {
    if (
        !state.purchaseId
    ) {
        return;
    }

    if (
        state.unsubscribePayments
    ) {
        state.unsubscribePayments();
    }

    const paymentsQuery =
        query(
            businessCollection(
                "purchasePayments"
            ),

            where(
                "purchaseId",
                "==",
                state.purchaseId
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
                    snapshotToRecords(
                        snapshot
                    );

                renderPayments();

                if (
                    state.purchase
                ) {
                    renderPurchase();
                }
            },

            (error) => {
                console.error(
                    "Purchase payments listener failed:",
                    error
                );
            }
        );
}


/* ============================================================
   PAYMENT MODAL
   ============================================================ */

function renderPaymentModalSummary() {
    if (
        !state.purchase
    ) {
        return;
    }

    const {
        balancePaise
    } =
        getPurchaseFinancials();

    if (
        elements.paymentModalPurchaseNumber
    ) {
        elements.paymentModalPurchaseNumber
            .textContent =
            text(
                state.purchase
                    .purchaseNumber
            ).trim() ||
            "—";
    }

    if (
        elements.paymentModalBalance
    ) {
        elements.paymentModalBalance
            .textContent =
            formatMoney(
                balancePaise
            );
    }
}


function resetPaymentForm() {
    if (
        elements.paymentAmount
    ) {
        elements.paymentAmount
            .value =
            "";
    }

    if (
        elements.paymentDate
    ) {
        elements.paymentDate
            .value =
            todayDateKey();
    }

    if (
        elements.paymentMethod
    ) {
        elements.paymentMethod
            .value =
            "cash";
    }

    if (
        elements.paymentReference
    ) {
        elements.paymentReference
            .value =
            "";
    }

    if (
        elements.paymentNote
    ) {
        elements.paymentNote
            .value =
            "";
    }

    if (
        elements.paymentAmountError
    ) {
        elements.paymentAmountError
            .textContent =
            "";
    }

    if (
        elements.paymentDateError
    ) {
        elements.paymentDateError
            .textContent =
            "";
    }

    hidePaymentFormMessage();
}


function openPaymentModal() {
    if (
        !state.purchase
    ) {
        return;
    }

    const {
        balancePaise
    } =
        getPurchaseFinancials();

    if (
        balancePaise <= 0
    ) {
        return;
    }

    resetPaymentForm();

    renderPaymentModalSummary();

    if (
        elements.paymentAmount
    ) {
        elements.paymentAmount
            .value =
            (
                balancePaise /
                100
            ).toFixed(
                2
            );
    }

    if (
        elements.paymentModal
    ) {
        elements.paymentModal
            .hidden =
            false;
    }

    document.body.classList.add(
        "modal-open"
    );

    window.setTimeout(
        () => {
            elements.paymentAmount
                ?.focus();
        },
        0
    );
}


function closePaymentModal() {
    if (
        state.paymentSubmitting
    ) {
        return;
    }

    if (
        elements.paymentModal
    ) {
        elements.paymentModal
            .hidden =
            true;
    }

    document.body.classList.remove(
        "modal-open"
    );
}


/* ============================================================
   PAYMENT MESSAGE
   ============================================================ */

function showPaymentFormMessage(
    message,
    type = "error"
) {
    if (
        !elements.paymentFormMessage
    ) {
        return;
    }

    elements.paymentFormMessage
        .hidden =
        false;

    elements.paymentFormMessage
        .textContent =
        message;

    elements.paymentFormMessage
        .dataset.type =
        type;
}


function hidePaymentFormMessage() {
    if (
        !elements.paymentFormMessage
    ) {
        return;
    }

    elements.paymentFormMessage
        .hidden =
        true;

    elements.paymentFormMessage
        .textContent =
        "";

    delete elements
        .paymentFormMessage
        .dataset.type;
}


/* ============================================================
   PAYMENT SUBMIT STATE
   ============================================================ */

function setPaymentSubmitting(
    submitting
) {
    state.paymentSubmitting =
        submitting;

    if (
        elements.savePaymentButton
    ) {
        elements.savePaymentButton
            .disabled =
            submitting;
    }

    if (
        elements.cancelPaymentButton
    ) {
        elements.cancelPaymentButton
            .disabled =
            submitting;
    }

    if (
        elements.closePaymentModalButton
    ) {
        elements.closePaymentModalButton
            .disabled =
            submitting;
    }

    if (
        elements.savePaymentSpinner
    ) {
        elements.savePaymentSpinner
            .hidden =
            !submitting;
    }

    if (
        elements.savePaymentButtonText
    ) {
        elements.savePaymentButtonText
            .textContent =
            submitting
                ? "Recording..."
                : "Record Payment";
    }
}


/* ============================================================
   FIREBASE ERROR
   ============================================================ */

function readableFirebaseError(
    error
) {
    const message =
        text(
            error?.message
        )
            .replace(
                /^Firebase:\s*/i,
                ""
            )
            .replace(
                /\s*\(functions\/[^)]+\)\.?$/i,
                ""
            )
            .trim();

    return (
        message ||
        "Unable to record the payment. Please try again."
    );
}


/* ============================================================
   RECORD PAYMENT
   ============================================================ */

async function handlePaymentSubmit(
    event
) {
    event.preventDefault();

    if (
        state.paymentSubmitting ||
        !state.purchase ||
        !state.purchaseId
    ) {
        return;
    }

    hidePaymentFormMessage();

    if (
        elements.paymentAmountError
    ) {
        elements.paymentAmountError
            .textContent =
            "";
    }

    if (
        elements.paymentDateError
    ) {
        elements.paymentDateError
            .textContent =
            "";
    }

    const amountPaise =
        parseMoneyToPaise(
            elements.paymentAmount
                ?.value
        );

    const paymentDate =
        elements.paymentDate
            ?.value || "";

    const {
        balancePaise
    } =
        getPurchaseFinancials();

    let valid =
        true;

    if (
        amountPaise === null ||
        amountPaise <= 0
    ) {
        if (
            elements.paymentAmountError
        ) {
            elements.paymentAmountError
                .textContent =
                "Enter a payment amount greater than zero.";
        }

        valid =
            false;
    } else if (
        amountPaise >
        balancePaise
    ) {
        if (
            elements.paymentAmountError
        ) {
            elements.paymentAmountError
                .textContent =
                "Payment cannot exceed the current payable balance.";
        }

        valid =
            false;
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            paymentDate
        )
    ) {
        if (
            elements.paymentDateError
        ) {
            elements.paymentDateError
                .textContent =
                "Select the payment date.";
        }

        valid =
            false;
    }

    if (!valid) {
        return;
    }

    setPaymentSubmitting(
        true
    );

    try {
        const recordPurchasePayment =
            httpsCallable(
                functions,
                "recordPurchasePayment"
            );

        const response =
            await recordPurchasePayment({
                purchaseId:
                    state.purchaseId,

                amountPaise,

                paymentDate,

                method:
                    elements.paymentMethod
                        ?.value ||
                    "cash",

                reference:
                    elements.paymentReference
                        ?.value
                        .trim() ||
                    "",

                note:
                    elements.paymentNote
                        ?.value
                        .trim() ||
                    ""
            });

        const result =
            response?.data || {};

        if (
            result.success ===
            false
        ) {
            throw new Error(
                result.message ||
                "Unable to record payment."
            );
        }

        showPaymentFormMessage(
            result.message ||
            "Payment recorded successfully.",
            "success"
        );

        /*
         * Firestore listeners update the page from the
         * backend transaction. Do not mutate purchase totals
         * locally.
         */

        window.setTimeout(
            () => {
                if (
                    !state
                        .paymentSubmitting
                ) {
                    closePaymentModal();
                }
            },
            250
        );

    } catch (error) {
        console.error(
            "Record purchase payment failed:",
            error
        );

        showPaymentFormMessage(
            readableFirebaseError(
                error
            )
        );

    } finally {
        setPaymentSubmitting(
            false
        );
    }
}


/* ============================================================
   PRINT INVOICE
   ============================================================ */

function handlePrintInvoice() {
    const purchaseNumber =
        text(
            state.purchase?.purchaseNumber
        )
            .trim()
            .toUpperCase();

    if (
        !purchaseNumber
    ) {
        return;
    }

    window.location.href =
        `/purchase-invoices/${encodeURIComponent(
            purchaseNumber
        )}`;
}


/* ============================================================
   GLOBAL SEARCH
   ============================================================ */

function normalizeSearchText(
    value
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


function containsSearch(
    search,
    ...values
) {
    return values.some(
        (value) =>
            normalizeSearchText(
                value
            ).includes(
                search
            )
    );
}


function findCustomer(
    customerId
) {
    return state.customers.find(
        (customer) =>
            customer.id ===
            customerId
    ) || null;
}


function getSalePartyName(
    sale
) {
    const snapshot =
        sale.customerSnapshot ||
        sale.customer ||
        sale.billTo ||
        {};

    const current =
        findCustomer(
            sale.customerId
        );

    return (
        text(
            snapshot.name
        ).trim() ||
        text(
            current?.name
        ).trim() ||
        "Customer"
    );
}


function getPurchasePartyName(
    purchase
) {
    const snapshot =
        purchase.supplierSnapshot ||
        purchase.supplier ||
        {};

    const current =
        findSupplier(
            purchase.supplierId
        );

    return (
        text(
            snapshot.name
        ).trim() ||
        text(
            snapshot.businessName
        ).trim() ||
        text(
            current?.name
        ).trim() ||
        text(
            current?.businessName
        ).trim() ||
        "Supplier"
    );
}


function buildSearchResults(
    searchText
) {
    const search =
        normalizeSearchText(
            searchText
        );

    if (!search) {
        return [];
    }

    const results = [];


    /* CUSTOMERS */

    state.customers.forEach(
        (customer) => {
            if (
                containsSearch(
                    search,
                    customer.customerNumber,
                    customer.name,
                    customer.mobile,
                    customer.email,
                    customer.gstin,
                    customer.address
                )
            ) {
                results.push({
                    type:
                        "Customer",

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
                            text(
                                customer.customerNumber
                            )
                                .trim()
                                .toUpperCase()
                        )}`
                        : "/customers"
                });
            }
        }
    );


    /* SUPPLIERS */

    state.suppliers.forEach(
        (supplier) => {
            const name =
                text(
                    supplier.name ||
                    supplier.businessName
                ).trim() ||
                "Supplier";

            if (
                containsSearch(
                    search,
                    name,
                    supplier.supplierNumber,
                    supplier.mobile,
                    supplier.email,
                    supplier.gstin,
                    supplier.address
                )
            ) {
                results.push({
                    type:
                        "Supplier",

                    title:
                        name,

                    subtitle:
                        supplier.mobile ||
                        supplier.email ||
                        "Supplier record",

                    href:
                        supplier.supplierNumber
                            ? `/suppliers/${encodeURIComponent(
                                text(
                                    supplier.supplierNumber
                                )
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/suppliers"
                });
            }
        }
    );


    /* SALES */

    state.sales.forEach(
        (sale) => {
            const party =
                getSalePartyName(
                    sale
                );

            const total =
                safePaise(
                    sale.grandTotalPaise
                );

            const balance =
                safePaise(
                    sale.balancePaise
                );

            if (
                containsSearch(
                    search,
                    sale.invoiceNumber,
                    party,
                    sale.customerSnapshot
                        ?.mobile,
                    sale.customerSnapshot
                        ?.gstin,
                    sale.saleType,
                    sale.status,
                    formatMoney(total),
                    formatMoney(balance),
                    total / 100,
                    balance / 100
                )
            ) {
                results.push({
                    type:
                        "Sell",

                    title:
                        sale.invoiceNumber ||
                        "Sale",

                    subtitle:
                        `${party} · ${formatMoney(
                            total
                        )}`,

                    href:
                        sale.invoiceNumber
                            ? `/sales/${encodeURIComponent(
                                text(
                                    sale.invoiceNumber
                                )
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/sales"
                });
            }
        }
    );


    /* PURCHASES */

    state.purchases.forEach(
        (purchase) => {
            const party =
                getPurchasePartyName(
                    purchase
                );

            const total =
                safePaise(
                    purchase
                        .grandTotalPaise
                );

            const balance =
                safePaise(
                    purchase
                        .balancePaise
                );

            if (
                containsSearch(
                    search,
                    purchase.purchaseNumber,
                    purchase
                        .supplierInvoiceNumber,
                    party,
                    purchase
                        .supplierSnapshot
                        ?.mobile,
                    purchase
                        .supplierSnapshot
                        ?.gstin,
                    purchase.purchaseType,
                    purchase.status,
                    formatMoney(total),
                    formatMoney(balance),
                    total / 100,
                    balance / 100
                )
            ) {
                results.push({
                    type:
                        "Buy",

                    title:
                        purchase.purchaseNumber ||
                        "Purchase",

                    subtitle:
                        `${party} · ${formatMoney(
                            total
                        )}`,

                    href:
                        purchase.purchaseNumber
                            ? `/purchases/${encodeURIComponent(
                                text(
                                    purchase.purchaseNumber
                                )
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
   SEARCH RENDER
   ============================================================ */

function hideSearchResults() {
    if (
        elements.globalSearchResults
    ) {
        elements.globalSearchResults
            .hidden =
            true;
    }
}


function renderSearchResults(
    searchText
) {
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
        content.appendChild(
            createElement(
                "div",
                "search-result-empty",
                "No matching customers, suppliers, Sell or Buy records."
            )
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
                createElement(
                    "a",
                    "search-result-item"
                );

            link.href =
                result.href;

            const information =
                createElement(
                    "div",
                    "search-result-content"
                );

            information.append(
                createElement(
                    "strong",
                    "",
                    result.title
                ),

                createElement(
                    "span",
                    "",
                    result.subtitle
                )
            );

            const type =
                createElement(
                    "span",
                    "search-result-type",
                    result.type
                );

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


function refreshSearchIfOpen() {
    if (
        !elements.globalSearchInput ||
        !elements.globalSearchResults ||
        elements.globalSearchResults
            .hidden
    ) {
        return;
    }

    renderSearchResults(
        elements.globalSearchInput
            .value
    );
}


/* ============================================================
   GLOBAL SEARCH DATA
   ============================================================ */

function startSearchListeners() {
    if (
        state.unsubscribeCustomers
    ) {
        return;
    }


    const customersQuery =
        query(
            businessCollection(
                "customers"
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );

    state.unsubscribeCustomers =
        onSnapshot(
            customersQuery,

            (snapshot) => {
                state.customers =
                    snapshotToRecords(
                        snapshot
                    );

                refreshSearchIfOpen();
            },

            (error) => {
                console.error(
                    "Customers search listener failed:",
                    error
                );
            }
        );


    const suppliersQuery =
        query(
            businessCollection(
                "suppliers"
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );

    state.unsubscribeSuppliers =
        onSnapshot(
            suppliersQuery,

            (snapshot) => {
                state.suppliers =
                    snapshotToRecords(
                        snapshot
                    );

                if (
                    state.purchase
                ) {
                    renderPurchase();
                }

                refreshSearchIfOpen();
            },

            (error) => {
                console.error(
                    "Suppliers search listener failed:",
                    error
                );
            }
        );


    const salesQuery =
        query(
            businessCollection(
                "sales"
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );

    state.unsubscribeSales =
        onSnapshot(
            salesQuery,

            (snapshot) => {
                state.sales =
                    snapshotToRecords(
                        snapshot
                    );

                refreshSearchIfOpen();
            },

            (error) => {
                console.error(
                    "Sales search listener failed:",
                    error
                );
            }
        );


    const purchasesQuery =
        query(
            businessCollection(
                "purchases"
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );

    state.unsubscribePurchases =
        onSnapshot(
            purchasesQuery,

            (snapshot) => {
                state.purchases =
                    snapshotToRecords(
                        snapshot
                    );

                refreshSearchIfOpen();
            },

            (error) => {
                console.error(
                    "Purchases search listener failed:",
                    error
                );
            }
        );
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function toggleMobileSidebar() {
    if (
        !elements.sidebar ||
        !elements.mobileMenuButton
    ) {
        return;
    }

    const currentlyOpen =
        elements.sidebar
            .classList
            .contains(
                "open"
            );

    elements.sidebar
        .classList
        .toggle(
            "open",
            !currentlyOpen
        );

    elements.sidebar
        .classList
        .toggle(
            "is-open",
            !currentlyOpen
        );

    elements.mobileMenuButton
        .setAttribute(
            "aria-expanded",
            String(
                !currentlyOpen
            )
        );

    if (
        elements.sidebarOverlay
    ) {
        elements.sidebarOverlay
            .hidden =
            currentlyOpen;
    }
}


function closeMobileSidebar() {
    elements.sidebar
        ?.classList
        .remove(
            "open",
            "is-open"
        );

    elements.mobileMenuButton
        ?.setAttribute(
            "aria-expanded",
            "false"
        );

    if (
        elements.sidebarOverlay
    ) {
        elements.sidebarOverlay
            .hidden =
            true;
    }
}


/* ============================================================
   MOBILE CREATE
   ============================================================ */

function handleMobileCreate() {

    window.location.href =
        "/purchases/new";
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
    } catch (error) {
        console.error(
            "Sign out failed:",
            error
        );
    }
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanupListeners() {
    [
        "unsubscribePurchase",
        "unsubscribePayments",
        "unsubscribeCustomers",
        "unsubscribeSuppliers",
        "unsubscribeSales",
        "unsubscribePurchases"
    ].forEach(
        (key) => {
            if (
                typeof state[key] ===
                "function"
            ) {
                state[key]();

                state[key] =
                    null;
            }
        }
    );
}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {
    elements.mobileMenuButton
        ?.addEventListener(
            "click",
            toggleMobileSidebar
        );

    elements.sidebarOverlay
        ?.addEventListener(
            "click",
            closeMobileSidebar
        );

    elements.logoutButton
        ?.addEventListener(
            "click",
            handleLogout
        );


    /* PRINT */

    elements.printInvoiceButton
        ?.addEventListener(
            "click",
            handlePrintInvoice
        );

    elements.headingPrintInvoiceButton
        ?.addEventListener(
            "click",
            handlePrintInvoice
        );


    /* PAYMENT */

    elements.recordPaymentButton
        ?.addEventListener(
            "click",
            openPaymentModal
        );

    elements.paymentHistoryAddButton
        ?.addEventListener(
            "click",
            openPaymentModal
        );

    elements.closePaymentModalButton
        ?.addEventListener(
            "click",
            closePaymentModal
        );

    elements.cancelPaymentButton
        ?.addEventListener(
            "click",
            closePaymentModal
        );

    elements.paymentForm
        ?.addEventListener(
            "submit",
            handlePaymentSubmit
        );

    elements.paymentModal
        ?.addEventListener(
            "click",
            (event) => {
                if (
                    event.target ===
                    elements.paymentModal
                ) {
                    closePaymentModal();
                }
            }
        );


    /* MOBILE + */

    elements.mobileNewTransactionButton
        ?.addEventListener(
            "click",
            handleMobileCreate
        );


    /* SEARCH */

    elements.globalSearchInput
        ?.addEventListener(
            "input",
            () => {
                renderSearchResults(
                    elements
                        .globalSearchInput
                        .value
                );
            }
        );

    elements.globalSearchInput
        ?.addEventListener(
            "focus",
            () => {
                if (
                    elements
                        .globalSearchInput
                        .value
                        .trim()
                ) {
                    renderSearchResults(
                        elements
                            .globalSearchInput
                            .value
                    );
                }
            }
        );


    /* DOCUMENT */

    document.addEventListener(
        "click",
        (event) => {
            if (
                elements.globalSearchResults &&
                elements.globalSearchInput &&
                !elements.globalSearchResults
                    .contains(
                        event.target
                    ) &&
                event.target !==
                    elements.globalSearchInput
            ) {
                hideSearchResults();
            }
        }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            hideSearchResults();

            closeMobileSidebar();

            if (
                elements.paymentModal &&
                !elements.paymentModal
                    .hidden
            ) {
                closePaymentModal();
            }
        }
    );


    window.addEventListener(
        "resize",
        () => {
            if (
                window.innerWidth >
                900
            ) {
                closeMobileSidebar();
            }
        }
    );

    window.addEventListener(
        "beforeunload",
        cleanupListeners
    );
}


/* ============================================================
   AUTH
   ============================================================ */

function startAuthentication() {

    onAuthStateChanged(
        auth,

        async (user) => {

            if (!user) {

                cleanupListeners();

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
                showPurchaseError(
                    "No Buy purchase was selected."
                );

                return;
            }


            showLoadingState();


            try {

                const resolvedPurchaseId =
                    await resolvePurchaseIdByNumber(
                        purchaseNumber
                    );


                if (
                    !resolvedPurchaseId
                ) {
                    showPurchaseError(
                        "This Buy purchase does not exist or is no longer available."
                    );

                    return;
                }


                state.purchaseId =
                    resolvedPurchaseId;


                startPurchaseListener();

                startPaymentListener();

                startSearchListeners();

            } catch (error) {

                console.error(
                    "Purchase resolution failed:",
                    error
                );


                showPurchaseError(
                    "Unable to load this Buy purchase."
                );
            }
        },

        (error) => {

            console.error(
                "Authentication check failed:",
                error
            );

            showPurchaseError(
                "Unable to verify your session."
            );
        }
    );
}




/* ============================================================
   INITIALIZE
   ============================================================ */

function initialize() {

    renderCurrentDate();

    bindEvents();

    if (
        elements.paymentDate
    ) {
        elements.paymentDate
            .value =
            todayDateKey();
    }

    showLoadingState();

    startAuthentication();
}


initialize();