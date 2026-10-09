/* ============================================================
   OM MARUTI DIAMOND
   NEW SELL PAGE
   ============================================================ */

import {
    collection,
    limit,
    onSnapshot,
    orderBy,
    query
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

const MAX_CUSTOMERS =
    1000;

const MAX_SALES =
    3000;

const MAX_SEARCH_CUSTOMERS =
    500;

const MAX_SEARCH_SUPPLIERS =
    500;

const MAX_SEARCH_PURCHASES =
    1000;


/* ============================================================
   URL
   ============================================================ */

const params =
    new URLSearchParams(
        window.location.search
    );

const PRESELECTED_CUSTOMER_NUMBER =
    String(
        params.get("customer") ?? ""
    )
        .trim()
        .toUpperCase();


/* ============================================================
   STATE
   ============================================================ */

const state = {
    customers: [],
    sales: [],

    searchSuppliers: [],
    searchPurchases: [],

    items: [],

    nextItemId: 1,

    submitting: false,

    /*
 * Retained across a failed/retried save so the backend
 * can prevent duplicate Sell invoices.
 */
    clientRequestId: "",

    listenersStarted: false,

    unsubscribeCustomers: null,
    unsubscribeSales: null,
    unsubscribeSuppliers: null,
    unsubscribePurchases: null
};


/* ============================================================
   DOM
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

    newSaleForm:
        document.getElementById(
            "newSaleForm"
        ),

    invoiceNumberPreview:
        document.getElementById(
            "invoiceNumberPreview"
        ),

    saleCustomerId:
        document.getElementById(
            "saleCustomerId"
        ),

    saleCustomerIdError:
        document.getElementById(
            "saleCustomerIdError"
        ),

    saleInvoiceDate:
        document.getElementById(
            "saleInvoiceDate"
        ),

    saleInvoiceDateError:
        document.getElementById(
            "saleInvoiceDateError"
        ),

    saleTypeCash:
        document.getElementById(
            "saleTypeCash"
        ),

    saleTypeCredit:
        document.getElementById(
            "saleTypeCredit"
        ),

    saleDueDateField:
        document.getElementById(
            "saleDueDateField"
        ),

    saleDueDate:
        document.getElementById(
            "saleDueDate"
        ),

    saleDueDateError:
        document.getElementById(
            "saleDueDateError"
        ),

    saleBroker:
        document.getElementById(
            "saleBroker"
        ),

    selectedCustomerPreview:
        document.getElementById(
            "selectedCustomerPreview"
        ),

    selectedCustomerName:
        document.getElementById(
            "selectedCustomerName"
        ),

    selectedCustomerStatus:
        document.getElementById(
            "selectedCustomerStatus"
        ),

    selectedCustomerMobile:
        document.getElementById(
            "selectedCustomerMobile"
        ),

    selectedCustomerEmail:
        document.getElementById(
            "selectedCustomerEmail"
        ),

    selectedCustomerGstin:
        document.getElementById(
            "selectedCustomerGstin"
        ),

    selectedCustomerReceivable:
        document.getElementById(
            "selectedCustomerReceivable"
        ),

    selectedCustomerAddress:
        document.getElementById(
            "selectedCustomerAddress"
        ),

    addSaleItemButton:
        document.getElementById(
            "addSaleItemButton"
        ),

    mobileAddItemButton:
        document.getElementById(
            "mobileAddItemButton"
        ),

    saleItemsBody:
        document.getElementById(
            "saleItemsBody"
        ),

    saleItemsError:
        document.getElementById(
            "saleItemsError"
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

    saleDiscount:
        document.getElementById(
            "saleDiscount"
        ),

    saleDiscountError:
        document.getElementById(
            "saleDiscountError"
        ),

    saleCharges:
        document.getElementById(
            "saleCharges"
        ),

    saleChargesError:
        document.getElementById(
            "saleChargesError"
        ),

    saleRoundOff:
        document.getElementById(
            "saleRoundOff"
        ),

    saleRoundOffError:
        document.getElementById(
            "saleRoundOffError"
        ),

    previousBalanceValue:
        document.getElementById(
            "previousBalanceValue"
        ),

    saleSubtotalValue:
        document.getElementById(
            "saleSubtotalValue"
        ),

    saleTaxValue:
        document.getElementById(
            "saleTaxValue"
        ),

    saleDiscountValue:
        document.getElementById(
            "saleDiscountValue"
        ),

    saleChargesValue:
        document.getElementById(
            "saleChargesValue"
        ),

    saleRoundOffValue:
        document.getElementById(
            "saleRoundOffValue"
        ),

    saleGrandTotalValue:
        document.getElementById(
            "saleGrandTotalValue"
        ),

    saleAmountWords:
        document.getElementById(
            "saleAmountWords"
        ),

    salePaymentHelp:
        document.getElementById(
            "salePaymentHelp"
        ),

    paymentInvoiceTotal:
        document.getElementById(
            "paymentInvoiceTotal"
        ),

    paymentReceivedPreview:
        document.getElementById(
            "paymentReceivedPreview"
        ),

    paymentBalancePreview:
        document.getElementById(
            "paymentBalancePreview"
        ),

    saleInitialPayment:
        document.getElementById(
            "saleInitialPayment"
        ),

    saleInitialPaymentError:
        document.getElementById(
            "saleInitialPaymentError"
        ),

    salePaymentDate:
        document.getElementById(
            "salePaymentDate"
        ),

    salePaymentDateError:
        document.getElementById(
            "salePaymentDateError"
        ),

    salePaymentMethod:
        document.getElementById(
            "salePaymentMethod"
        ),

    salePaymentReference:
        document.getElementById(
            "salePaymentReference"
        ),

    saleNotes:
        document.getElementById(
            "saleNotes"
        ),

    saleDeclaration:
        document.getElementById(
            "saleDeclaration"
        ),

    saleFormMessage:
        document.getElementById(
            "saleFormMessage"
        ),

    saveDraftButton:
        document.getElementById(
            "saveDraftButton"
        ),

    saveSaleButton:
        document.getElementById(
            "saveSaleButton"
        ),

    saveSaleButtonText:
        document.getElementById(
            "saveSaleButtonText"
        ),

    saveSaleSpinner:
        document.getElementById(
            "saveSaleSpinner"
        ),

    topSaveSaleButton:
        document.getElementById(
            "topSaveSaleButton"
        )
};


/* ============================================================
   DATE HELPERS
   ============================================================ */

function dateToInputValue(date) {
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


function parseDateInput(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] = value
        .split("-")
        .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day,
            12,
            0,
            0,
            0
        );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


function setCurrentDate() {
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
        ).format(
            new Date()
        );
}


/* ============================================================
   FIRESTORE TIMESTAMP
   ============================================================ */

function timestampToDate(value) {
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

    return null;
}


/* ============================================================
   MONEY
   ============================================================ */

function formatMoney(paise) {
    const safePaise =
        Number.isSafeInteger(paise)
            ? paise
            : 0;

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        safePaise / 100
    );
}


/*
 * Convert user-entered rupees to integer paise without
 * relying on floating-point multiplication.
 */

function parseMoneyToPaise(
    value,
    {
        allowNegative = false,
        allowEmpty = true
    } = {}
) {
    const text =
        String(value ?? "")
            .trim()
            .replace(/,/g, "");

    if (!text) {
        return allowEmpty
            ? 0
            : null;
    }

    const pattern =
        allowNegative
            ? /^-?\d+(?:\.\d{1,2})?$/
            : /^\d+(?:\.\d{1,2})?$/;

    if (!pattern.test(text)) {
        return null;
    }

    const negative =
        text.startsWith("-");

    const unsigned =
        negative
            ? text.slice(1)
            : text;

    const [
        rupeesPart,
        paisePart = ""
    ] = unsigned.split(".");

    const rupees =
        Number(rupeesPart);

    const paise =
        Number(
            paisePart.padEnd(
                2,
                "0"
            )
        );

    if (
        !Number.isSafeInteger(rupees) ||
        !Number.isSafeInteger(paise)
    ) {
        return null;
    }

    const result =
        (rupees * 100) +
        paise;

    if (
        !Number.isSafeInteger(result)
    ) {
        return null;
    }

    return negative
        ? -result
        : result;
}


/* ============================================================
   DECIMAL HELPERS
   ============================================================ */

function parseNonNegativeNumber(
    value,
    maxDecimals = 3
) {
    const text =
        String(value ?? "")
            .trim()
            .replace(/,/g, "");

    if (!text) {
        return 0;
    }

    const pattern =
        new RegExp(
            `^\\d+(?:\\.\\d{1,${maxDecimals}})?$`
        );

    if (!pattern.test(text)) {
        return null;
    }

    const number =
        Number(text);

    if (
        !Number.isFinite(number) ||
        number < 0
    ) {
        return null;
    }

    return number;
}


/* ============================================================
   PERCENTAGE
   ============================================================ */

function parsePercentage(value) {
    const number =
        parseNonNegativeNumber(
            value,
            3
        );

    if (
        number === null ||
        number > 100
    ) {
        return null;
    }

    return number;
}


/* ============================================================
   INTEGER
   ============================================================ */

function parsePieces(value) {
    const text =
        String(value ?? "")
            .trim();

    if (!text) {
        return 0;
    }

    if (!/^\d+$/.test(text)) {
        return null;
    }

    const pieces =
        Number(text);

    if (
        !Number.isSafeInteger(pieces) ||
        pieces < 0
    ) {
        return null;
    }

    return pieces;
}


/* ============================================================
   SAFE INTEGER ROUND
   ============================================================ */

function safeRound(value) {
    if (
        !Number.isFinite(value)
    ) {
        return 0;
    }

    const rounded =
        Math.round(value);

    return Number.isSafeInteger(rounded)
        ? rounded
        : 0;
}


/* ============================================================
   INDIAN NUMBER WORDS
   ============================================================ */

const SMALL_NUMBERS = [
    "Zero",
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

const TENS = [
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


function belowHundredToWords(number) {
    if (number < 20) {
        return SMALL_NUMBERS[number];
    }

    const tens =
        Math.floor(number / 10);

    const ones =
        number % 10;

    return ones
        ? `${TENS[tens]} ${SMALL_NUMBERS[ones]}`
        : TENS[tens];
}


function belowThousandToWords(number) {
    const parts = [];

    const hundreds =
        Math.floor(number / 100);

    const remainder =
        number % 100;

    if (hundreds) {
        parts.push(
            `${SMALL_NUMBERS[hundreds]} Hundred`
        );
    }

    if (remainder) {
        parts.push(
            belowHundredToWords(
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

    const parts = [];

    const crore =
        Math.floor(
            number / 10000000
        );

    number %= 10000000;

    const lakh =
        Math.floor(
            number / 100000
        );

    number %= 100000;

    const thousand =
        Math.floor(
            number / 1000
        );

    number %= 1000;


    if (crore) {
        parts.push(
            `${integerToIndianWords(crore)} Crore`
        );
    }

    if (lakh) {
        parts.push(
            `${belowThousandToWords(lakh)} Lakh`
        );
    }

    if (thousand) {
        parts.push(
            `${belowThousandToWords(thousand)} Thousand`
        );
    }

    if (number) {
        parts.push(
            belowThousandToWords(number)
        );
    }

    return parts.join(" ");
}


function moneyToWords(paise) {
    if (
        !Number.isSafeInteger(paise) ||
        paise < 0
    ) {
        return "Zero Rupees Only";
    }

    const rupees =
        Math.floor(
            paise / 100
        );

    const remainingPaise =
        paise % 100;

    let result =
        `${integerToIndianWords(rupees)} Rupees`;

    if (remainingPaise > 0) {
        result +=
            ` and ${integerToIndianWords(remainingPaise)} Paise`;
    }

    return `${result} Only`;
}


/* ============================================================
   SALE HELPERS
   ============================================================ */

function saleIsActive(sale) {
    const status =
        String(
            sale?.status ?? ""
        )
            .trim()
            .toLowerCase();

    return (
        status !== "draft" &&
        status !== "cancelled" &&
        status !== "canceled"
    );
}


function saleBalance(sale) {
    if (
        Number.isSafeInteger(
            sale?.balancePaise
        )
    ) {
        return Math.max(
            0,
            sale.balancePaise
        );
    }

    const total =
        Number.isSafeInteger(
            sale?.grandTotalPaise
        )
            ? sale.grandTotalPaise
            : 0;

    const received =
        Number.isSafeInteger(
            sale?.receivedPaise
        )
            ? sale.receivedPaise
            : 0;

    return Math.max(
        0,
        total - received
    );
}


/* ============================================================
   CUSTOMER
   ============================================================ */

function selectedCustomer() {
    const id =
        elements.saleCustomerId
            ?.value ?? "";

    return state.customers.find(
        (customer) =>
            customer.id === id
    ) ?? null;
}


function customerReceivable(
    customerId
) {
    return state.sales
        .filter(
            (sale) =>
                sale.customerId ===
                    customerId &&
                saleIsActive(sale)
        )
        .reduce(
            (sum, sale) =>
                sum +
                saleBalance(sale),
            0
        );
}


/* ============================================================
   CUSTOMER SELECT
   ============================================================ */

function renderCustomerOptions() {
    if (!elements.saleCustomerId) {
        return;
    }

    const previousValue =
        elements.saleCustomerId.value;

    elements.saleCustomerId
        .replaceChildren();


    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value = "";
    placeholder.textContent =
        "Select customer";

    elements.saleCustomerId
        .appendChild(
            placeholder
        );


    const customers =
        [...state.customers]
            .filter(
                (customer) =>
                    customer.active !== false
            )
            .sort(
                (a, b) =>
                    String(
                        a.name ?? ""
                    ).localeCompare(
                        String(
                            b.name ?? ""
                        ),
                        "en",
                        {
                            sensitivity:
                                "base"
                        }
                    )
            );


    for (
        const customer
        of customers
    ) {
        const option =
            document.createElement(
                "option"
            );

        option.value =
            customer.id;

        const mobile =
            String(
                customer.mobile ?? ""
            ).trim();

        option.textContent =
            mobile
                ? `${customer.name || "Unnamed Customer"} — ${mobile}`
                : customer.name ||
                    "Unnamed Customer";

        elements.saleCustomerId
            .appendChild(
                option
            );
    }


    let nextValue = "";

    if (
        previousValue &&
        customers.some(
            (customer) =>
                customer.id ===
                previousValue
        )
    ) {
        nextValue =
            previousValue;
    } else if (
    PRESELECTED_CUSTOMER_NUMBER
    ) {
        const preselectedCustomer =
            customers.find(
                (customer) =>
                    String(
                        customer.customerNumber ?? ""
                    )
                        .trim()
                        .toUpperCase() ===
                    PRESELECTED_CUSTOMER_NUMBER
            );

        if (preselectedCustomer) {
            nextValue =
                preselectedCustomer.id;
        }
    }


    elements.saleCustomerId.value =
        nextValue;

    renderSelectedCustomer();
}


/* ============================================================
   CUSTOMER PREVIEW
   ============================================================ */

function renderSelectedCustomer() {
    const customer =
        selectedCustomer();


    if (!customer) {
        if (
            elements.selectedCustomerPreview
        ) {
            elements.selectedCustomerPreview.hidden =
                true;
        }

        if (
            elements.previousBalanceValue
        ) {
            elements.previousBalanceValue.textContent =
                formatMoney(0);
        }

        return;
    }


    const receivable =
        customerReceivable(
            customer.id
        );


    if (
        elements.selectedCustomerPreview
    ) {
        elements.selectedCustomerPreview.hidden =
            false;
    }


    if (
        elements.selectedCustomerName
    ) {
        elements.selectedCustomerName.textContent =
            customer.name ||
            "Unnamed Customer";
    }


    if (
        elements.selectedCustomerMobile
    ) {
        elements.selectedCustomerMobile.textContent =
            customer.mobile ||
            "—";
    }


    if (
        elements.selectedCustomerEmail
    ) {
        elements.selectedCustomerEmail.textContent =
            customer.email ||
            "—";
    }


    if (
        elements.selectedCustomerGstin
    ) {
        elements.selectedCustomerGstin.textContent =
            customer.gstin ||
            "—";
    }


    if (
        elements.selectedCustomerAddress
    ) {
        elements.selectedCustomerAddress.textContent =
            customer.address ||
            "—";
    }


    if (
        elements.selectedCustomerReceivable
    ) {
        elements.selectedCustomerReceivable.textContent =
            formatMoney(
                receivable
            );
    }


    if (
        elements.previousBalanceValue
    ) {
        elements.previousBalanceValue.textContent =
            formatMoney(
                receivable
            );
    }


    if (
        elements.selectedCustomerStatus
    ) {
        const active =
            customer.active !== false;

        elements.selectedCustomerStatus.textContent =
            active
                ? "Active"
                : "Inactive";
    }
}


/* ============================================================
   SELL TYPE
   ============================================================ */

function currentSaleType() {
    return elements.saleTypeCredit
        ?.checked
        ? "credit"
        : "cash";
}


function updateSaleTypeUI() {
    const saleType =
        currentSaleType();

    const isCredit =
        saleType === "credit";


    if (
        elements.saleDueDateField
    ) {
        elements.saleDueDateField.hidden =
            !isCredit;
    }


    if (
        elements.saleDueDate
    ) {
        elements.saleDueDate.required =
            isCredit;

        if (!isCredit) {
            elements.saleDueDate.value =
                "";
        }
    }


    if (
        elements.salePaymentHelp
    ) {
        elements.salePaymentHelp.textContent =
            isCredit
                ? "Credit Sell may be unpaid, partially paid, or fully paid."
                : "Cash Sell must be fully settled.";
    }


    /*
     * Cash Sell must equal the full invoice total.
     * We automatically mirror the grand total into
     * Initial Receipt for convenience.
     */

    if (!isCredit) {
        const totals =
            calculateTotals();

        if (
            elements.saleInitialPayment
        ) {
            elements.saleInitialPayment.value =
                paiseToEditableMoney(
                    totals.grandTotalPaise
                );
        }
    }


    updatePaymentPreview();
}


/* ============================================================
   EDITABLE MONEY
   ============================================================ */

function paiseToEditableMoney(paise) {
    const safe =
        Number.isSafeInteger(paise)
            ? paise
            : 0;

    return (
        safe / 100
    ).toFixed(2);
}


/* ============================================================
   ITEM MODEL
   ============================================================ */

function createEmptyItem() {
    return {
        id:
            state.nextItemId++,

        material:
            "Diamond",

        description:
            "",

        remarks:
            "",

        hsn:
            "7102",

        pieces:
            "",

        carat:
            "",

        rate:
            "",

        discountPercent:
            "0",

        taxPercent:
            "0"
    };
}


/* ============================================================
   ITEM CALCULATION
   ============================================================ */

function calculateItem(item) {
    const pieces =
        parsePieces(
            item.pieces
        );

    const carat =
        parseNonNegativeNumber(
            item.carat,
            3
        );

    const ratePaise =
        parseMoneyToPaise(
            item.rate,
            {
                allowEmpty: true
            }
        );

    const discountPercent =
        parsePercentage(
            item.discountPercent
        );

    const taxPercent =
        parsePercentage(
            item.taxPercent
        );


    const valid =
        pieces !== null &&
        carat !== null &&
        ratePaise !== null &&
        discountPercent !== null &&
        taxPercent !== null;


    if (!valid) {
        return {
            valid: false,

            pieces:
                pieces ?? 0,

            carat:
                carat ?? 0,

            grossAmountPaise: 0,
            discountPaise: 0,
            taxableAmountPaise: 0,
            taxPaise: 0,
            lineTotalPaise: 0
        };
    }


    /*
     * Diamond rate is interpreted as rupees per carat.
     *
     * ratePaise × carat gives line value in paise.
     */

    const grossAmountPaise =
        safeRound(
            ratePaise *
            carat
        );


    const discountPaise =
        safeRound(
            grossAmountPaise *
            discountPercent /
            100
        );


    const taxableAmountPaise =
        Math.max(
            0,
            grossAmountPaise -
            discountPaise
        );


    const taxPaise =
        safeRound(
            taxableAmountPaise *
            taxPercent /
            100
        );


    const lineTotalPaise =
        taxableAmountPaise +
        taxPaise;


    return {
        valid: true,

        pieces,
        carat,

        grossAmountPaise,
        discountPaise,
        taxableAmountPaise,
        taxPaise,
        lineTotalPaise
    };
}


/* ============================================================
   CREATE INPUT
   ============================================================ */

function createItemInput({
    value,
    field,
    itemId,
    placeholder = "",
    inputMode = "text",
    className = ""
}) {
    const input =
        document.createElement(
            "input"
        );

    input.type =
        "text";

    input.value =
        value ?? "";

    input.placeholder =
        placeholder;

    input.inputMode =
        inputMode;

    input.autocomplete =
        "off";

    input.className =
        `sale-item-input ${className}`
            .trim();

    input.dataset.itemId =
        String(itemId);

    input.dataset.field =
        field;

    return input;
}


/* ============================================================
   ITEM CELL
   ============================================================ */

function createCell() {
    return document.createElement(
        "td"
    );
}


/* ============================================================
   RENDER ITEMS
   ============================================================ */

function renderItems() {
    if (!elements.saleItemsBody) {
        return;
    }


    elements.saleItemsBody
        .replaceChildren();


    state.items.forEach(
        (item, index) => {

            const calculation =
                calculateItem(
                    item
                );

            const row =
                document.createElement(
                    "tr"
                );


            /* ---------------------------------------------
               SERIAL
               --------------------------------------------- */

            const serialCell =
                createCell();

            serialCell.className =
                "sale-item-serial";

            serialCell.textContent =
                String(index + 1);

            row.appendChild(
                serialCell
            );


            /* ---------------------------------------------
               MATERIAL
               --------------------------------------------- */

            const materialCell =
                createCell();

            materialCell.appendChild(
                createItemInput({
                    value:
                        item.material,

                    field:
                        "material",

                    itemId:
                        item.id,

                    placeholder:
                        "Diamond"
                })
            );

            row.appendChild(
                materialCell
            );


            /* ---------------------------------------------
               DESCRIPTION
               --------------------------------------------- */

            const descriptionCell =
                createCell();

            descriptionCell.appendChild(
                createItemInput({
                    value:
                        item.description,

                    field:
                        "description",

                    itemId:
                        item.id,

                    placeholder:
                        "RD/VVS/VS/D-F..."
                })
            );

            row.appendChild(
                descriptionCell
            );


            /* ---------------------------------------------
               REMARKS
               --------------------------------------------- */

            const remarksCell =
                createCell();

            remarksCell.appendChild(
                createItemInput({
                    value:
                        item.remarks,

                    field:
                        "remarks",

                    itemId:
                        item.id,

                    placeholder:
                        "Optional"
                })
            );

            row.appendChild(
                remarksCell
            );


            /* ---------------------------------------------
               HSN
               --------------------------------------------- */

            const hsnCell =
                createCell();

            hsnCell.appendChild(
                createItemInput({
                    value:
                        item.hsn,

                    field:
                        "hsn",

                    itemId:
                        item.id,

                    placeholder:
                        "7102",

                    inputMode:
                        "numeric"
                })
            );

            row.appendChild(
                hsnCell
            );


            /* ---------------------------------------------
               PIECES
               --------------------------------------------- */

            const piecesCell =
                createCell();

            piecesCell.appendChild(
                createItemInput({
                    value:
                        item.pieces,

                    field:
                        "pieces",

                    itemId:
                        item.id,

                    placeholder:
                        "0",

                    inputMode:
                        "numeric",

                    className:
                        "sale-item-number"
                })
            );

            row.appendChild(
                piecesCell
            );


            /* ---------------------------------------------
               CARAT
               --------------------------------------------- */

            const caratCell =
                createCell();

            caratCell.appendChild(
                createItemInput({
                    value:
                        item.carat,

                    field:
                        "carat",

                    itemId:
                        item.id,

                    placeholder:
                        "0.000",

                    inputMode:
                        "decimal",

                    className:
                        "sale-item-number"
                })
            );

            row.appendChild(
                caratCell
            );


            /* ---------------------------------------------
               RATE
               --------------------------------------------- */

            const rateCell =
                createCell();

            rateCell.appendChild(
                createItemInput({
                    value:
                        item.rate,

                    field:
                        "rate",

                    itemId:
                        item.id,

                    placeholder:
                        "0.00",

                    inputMode:
                        "decimal",

                    className:
                        "sale-item-number"
                })
            );

            row.appendChild(
                rateCell
            );


            /* ---------------------------------------------
               DISCOUNT %
               --------------------------------------------- */

            const discountCell =
                createCell();

            discountCell.appendChild(
                createItemInput({
                    value:
                        item.discountPercent,

                    field:
                        "discountPercent",

                    itemId:
                        item.id,

                    placeholder:
                        "0",

                    inputMode:
                        "decimal",

                    className:
                        "sale-item-number"
                })
            );

            row.appendChild(
                discountCell
            );


            /* ---------------------------------------------
               TAXABLE AMOUNT
               --------------------------------------------- */

            const amountCell =
                createCell();

            const amount =
                document.createElement(
                    "span"
                );

            amount.className =
                "sale-item-readonly";

            amount.textContent =
                calculation.valid
                    ? formatMoney(
                        calculation
                            .taxableAmountPaise
                    )
                    : "—";

            amountCell.appendChild(
                amount
            );

            row.appendChild(
                amountCell
            );


            /* ---------------------------------------------
               TAX %
               --------------------------------------------- */

            const taxPercentCell =
                createCell();

            taxPercentCell.appendChild(
                createItemInput({
                    value:
                        item.taxPercent,

                    field:
                        "taxPercent",

                    itemId:
                        item.id,

                    placeholder:
                        "0",

                    inputMode:
                        "decimal",

                    className:
                        "sale-item-number"
                })
            );

            row.appendChild(
                taxPercentCell
            );


            /* ---------------------------------------------
               TAX AMOUNT
               --------------------------------------------- */

            const taxCell =
                createCell();

            const taxAmount =
                document.createElement(
                    "span"
                );

            taxAmount.className =
                "sale-item-readonly";

            taxAmount.textContent =
                calculation.valid
                    ? formatMoney(
                        calculation.taxPaise
                    )
                    : "—";

            taxCell.appendChild(
                taxAmount
            );

            row.appendChild(
                taxCell
            );


            /* ---------------------------------------------
               TOTAL
               --------------------------------------------- */

            const totalCell =
                createCell();

            const total =
                document.createElement(
                    "span"
                );

            total.className =
                "sale-item-readonly";

            total.textContent =
                calculation.valid
                    ? formatMoney(
                        calculation
                            .lineTotalPaise
                    )
                    : "—";

            totalCell.appendChild(
                total
            );

            row.appendChild(
                totalCell
            );


            /* ---------------------------------------------
               REMOVE
               --------------------------------------------- */

            const removeCell =
                createCell();

            const removeButton =
                document.createElement(
                    "button"
                );

            removeButton.type =
                "button";

            removeButton.className =
                "sale-item-remove";

            removeButton.dataset.removeItemId =
                String(
                    item.id
                );

            removeButton.setAttribute(
                "aria-label",
                `Remove item ${index + 1}`
            );

            removeButton.textContent =
                "×";

            removeCell.appendChild(
                removeButton
            );

            row.appendChild(
                removeCell
            );


            elements.saleItemsBody
                .appendChild(
                    row
                );
        }
    );


    renderTotals();
}


/* ============================================================
   ADD ITEM
   ============================================================ */

function addItem({
    focus = true
} = {}) {
    const item =
        createEmptyItem();

    state.items.push(
        item
    );

    renderItems();


    if (focus) {
        requestAnimationFrame(
            () => {
                const input =
                    elements.saleItemsBody
                        ?.querySelector(
                            `[data-item-id="${item.id}"][data-field="description"]`
                        );

                input?.focus();
            }
        );
    }
}


/* ============================================================
   REMOVE ITEM
   ============================================================ */

function removeItem(itemId) {
    if (
        state.items.length <= 1
    ) {
        /*
         * Keep one editable row rather than leaving
         * the invoice table completely empty.
         */

        const item =
            state.items[0];

        if (item) {
            Object.assign(
                item,
                createEmptyItem(),
                {
                    id: item.id
                }
            );
        }

        renderItems();

        return;
    }


    state.items =
        state.items.filter(
            (item) =>
                item.id !== itemId
        );

    renderItems();
}


/* ============================================================
   ITEM INPUT
   ============================================================ */

function handleItemInput(event) {
    const input =
        event.target.closest(
            "[data-item-id][data-field]"
        );

    if (!input) {
        return;
    }


    const itemId =
        Number(
            input.dataset.itemId
        );

    const field =
        input.dataset.field;

    const item =
        state.items.find(
            (candidate) =>
                candidate.id === itemId
        );


    if (
        !item ||
        !Object.prototype
            .hasOwnProperty.call(
                item,
                field
            )
    ) {
        return;
    }


    item[field] =
        input.value;


    /*
     * Re-render calculations without replacing the
     * currently focused input.
     */

    renderTotals();

    updateItemCalculatedCells(
        input.closest("tr"),
        item
    );
}


/* ============================================================
   UPDATE ONE ROW CALCULATIONS
   ============================================================ */

function updateItemCalculatedCells(
    row,
    item
) {
    if (!row) {
        return;
    }

    const calculation =
        calculateItem(
            item
        );

    /*
     * Table columns:
     *
     * 10 = taxable amount
     * 12 = tax amount
     * 13 = line total
     *
     * zero-based cell indexes:
     * 9, 11, 12
     */

    const amount =
        row.cells[9]
            ?.querySelector(
                ".sale-item-readonly"
            );

    const tax =
        row.cells[11]
            ?.querySelector(
                ".sale-item-readonly"
            );

    const total =
        row.cells[12]
            ?.querySelector(
                ".sale-item-readonly"
            );


    if (amount) {
        amount.textContent =
            calculation.valid
                ? formatMoney(
                    calculation
                        .taxableAmountPaise
                )
                : "—";
    }


    if (tax) {
        tax.textContent =
            calculation.valid
                ? formatMoney(
                    calculation.taxPaise
                )
                : "—";
    }


    if (total) {
        total.textContent =
            calculation.valid
                ? formatMoney(
                    calculation
                        .lineTotalPaise
                )
                : "—";
    }
}


/* ============================================================
   ITEM TOTALS
   ============================================================ */

function calculateItemTotals() {
    let totalPieces = 0;
    let totalCarat = 0;

    let subtotalPaise = 0;
    let taxPaise = 0;
    let lineGrandTotalPaise = 0;


    for (
        const item
        of state.items
    ) {
        const calculation =
            calculateItem(
                item
            );

        if (!calculation.valid) {
            continue;
        }

        totalPieces +=
            calculation.pieces;

        totalCarat +=
            calculation.carat;

        subtotalPaise +=
            calculation
                .taxableAmountPaise;

        taxPaise +=
            calculation.taxPaise;

        lineGrandTotalPaise +=
            calculation
                .lineTotalPaise;
    }


    return {
        totalPieces,
        totalCarat,

        subtotalPaise,
        taxPaise,
        lineGrandTotalPaise
    };
}


/* ============================================================
   COMPLETE TOTALS
   ============================================================ */

function calculateTotals() {
    const itemTotals =
        calculateItemTotals();


    const discountPaise =
        parseMoneyToPaise(
            elements.saleDiscount
                ?.value ?? "0"
        );

    const chargesPaise =
        parseMoneyToPaise(
            elements.saleCharges
                ?.value ?? "0"
        );

    const roundOffPaise =
        parseMoneyToPaise(
            elements.saleRoundOff
                ?.value ?? "0",
            {
                allowNegative: true
            }
        );


    const safeDiscount =
        discountPaise ?? 0;

    const safeCharges =
        chargesPaise ?? 0;

    const safeRoundOff =
        roundOffPaise ?? 0;


    /*
     * Item tax is already calculated after each item's
     * line discount.
     *
     * Additional invoice discount is applied after the
     * item-level amount/tax calculation for now.
     *
     * The backend will repeat the exact authoritative
     * calculation before any invoice is saved.
     */

    const grandTotalPaise =
        Math.max(
            0,
            itemTotals
                .lineGrandTotalPaise -
            safeDiscount +
            safeCharges +
            safeRoundOff
        );


    return {
        ...itemTotals,

        discountPaise:
            safeDiscount,

        chargesPaise:
            safeCharges,

        roundOffPaise:
            safeRoundOff,

        grandTotalPaise
    };
}


/* ============================================================
   RENDER TOTALS
   ============================================================ */

function renderTotals() {
    const totals =
        calculateTotals();


    if (
        elements.itemsTotalPieces
    ) {
        elements.itemsTotalPieces.textContent =
            String(
                totals.totalPieces
            );
    }


    if (
        elements.itemsTotalCarat
    ) {
        elements.itemsTotalCarat.textContent =
            totals.totalCarat
                .toFixed(3);
    }


    if (
        elements.itemsTotalAmount
    ) {
        elements.itemsTotalAmount.textContent =
            formatMoney(
                totals.subtotalPaise
            );
    }


    if (
        elements.itemsTotalTax
    ) {
        elements.itemsTotalTax.textContent =
            formatMoney(
                totals.taxPaise
            );
    }


    if (
        elements.itemsGrandLineTotal
    ) {
        elements.itemsGrandLineTotal.textContent =
            formatMoney(
                totals.lineGrandTotalPaise
            );
    }


    if (
        elements.saleSubtotalValue
    ) {
        elements.saleSubtotalValue.textContent =
            formatMoney(
                totals.subtotalPaise
            );
    }


    if (
        elements.saleTaxValue
    ) {
        elements.saleTaxValue.textContent =
            formatMoney(
                totals.taxPaise
            );
    }


    if (
        elements.saleDiscountValue
    ) {
        elements.saleDiscountValue.textContent =
            `− ${formatMoney(
                totals.discountPaise
            )}`;
    }


    if (
        elements.saleChargesValue
    ) {
        elements.saleChargesValue.textContent =
            formatMoney(
                totals.chargesPaise
            );
    }


    if (
        elements.saleRoundOffValue
    ) {
        const value =
            totals.roundOffPaise;

        elements.saleRoundOffValue.textContent =
            value < 0
                ? `− ${formatMoney(
                    Math.abs(value)
                )}`
                : formatMoney(value);
    }


    if (
        elements.saleGrandTotalValue
    ) {
        elements.saleGrandTotalValue.textContent =
            formatMoney(
                totals.grandTotalPaise
            );
    }


    if (
        elements.saleAmountWords
    ) {
        elements.saleAmountWords.textContent =
            moneyToWords(
                totals.grandTotalPaise
            );
    }


    /*
     * Cash invoices always mirror the full total into
     * Initial Receipt.
     */

    if (
        currentSaleType() === "cash" &&
        elements.saleInitialPayment
    ) {
        elements.saleInitialPayment.value =
            paiseToEditableMoney(
                totals.grandTotalPaise
            );
    }


    updatePaymentPreview();
}


/* ============================================================
   PAYMENT PREVIEW
   ============================================================ */

function updatePaymentPreview() {
    const totals =
        calculateTotals();

    const initialPaymentPaise =
        parseMoneyToPaise(
            elements.saleInitialPayment
                ?.value ?? "0"
        );

    const received =
        initialPaymentPaise === null
            ? 0
            : initialPaymentPaise;

    const balance =
        Math.max(
            0,
            totals.grandTotalPaise -
            received
        );


    if (
        elements.paymentInvoiceTotal
    ) {
        elements.paymentInvoiceTotal.textContent =
            formatMoney(
                totals.grandTotalPaise
            );
    }


    if (
        elements.paymentReceivedPreview
    ) {
        elements.paymentReceivedPreview.textContent =
            formatMoney(
                received
            );
    }


    if (
        elements.paymentBalancePreview
    ) {
        elements.paymentBalancePreview.textContent =
            formatMoney(
                balance
            );
    }
}


/* ============================================================
   ERRORS
   ============================================================ */

function clearErrors() {
    const errorElements = [
        elements.saleCustomerIdError,
        elements.saleInvoiceDateError,
        elements.saleDueDateError,
        elements.saleItemsError,
        elements.saleDiscountError,
        elements.saleChargesError,
        elements.saleRoundOffError,
        elements.saleInitialPaymentError,
        elements.salePaymentDateError
    ];

    for (
        const element
        of errorElements
    ) {
        if (element) {
            element.textContent = "";
        }
    }
}


/* ============================================================
   FORM MESSAGE
   ============================================================ */

function hideFormMessage() {
    if (!elements.saleFormMessage) {
        return;
    }

    elements.saleFormMessage.hidden =
        true;

    elements.saleFormMessage.textContent =
        "";

    elements.saleFormMessage
        .removeAttribute(
            "data-type"
        );
}


function showFormMessage(
    message,
    type = "info"
) {
    if (!elements.saleFormMessage) {
        return;
    }

    elements.saleFormMessage.textContent =
        String(message ?? "");

    elements.saleFormMessage.dataset.type =
        type;

    elements.saleFormMessage.hidden =
        false;
}


/* ============================================================
   ITEM VALIDATION
   ============================================================ */

function validateItems() {
    if (
        state.items.length === 0
    ) {
        return {
            valid: false,
            items: []
        };
    }


    const preparedItems = [];

    let valid = true;


    state.items.forEach(
        (item, index) => {

            const material =
                String(
                    item.material ?? ""
                ).trim();

            const description =
                String(
                    item.description ?? ""
                ).trim();

            const remarks =
                String(
                    item.remarks ?? ""
                ).trim();

            const hsn =
                String(
                    item.hsn ?? ""
                ).trim();

            const pieces =
                parsePieces(
                    item.pieces
                );

            const carat =
                parseNonNegativeNumber(
                    item.carat,
                    3
                );

            const ratePaise =
                parseMoneyToPaise(
                    item.rate,
                    {
                        allowEmpty:
                            false
                    }
                );

            const discountPercent =
                parsePercentage(
                    item.discountPercent
                );

            const taxPercent =
                parsePercentage(
                    item.taxPercent
                );

            const calculation =
                calculateItem(
                    item
                );


            if (
                !material ||
                !description ||
                pieces === null ||
                pieces <= 0 ||
                carat === null ||
                carat <= 0 ||
                ratePaise === null ||
                ratePaise <= 0 ||
                discountPercent === null ||
                taxPercent === null ||
                !calculation.valid ||
                calculation
                    .taxableAmountPaise <= 0
            ) {
                valid = false;

                return;
            }


            preparedItems.push({
                lineNumber:
                    index + 1,

                material,
                description,
                remarks,
                hsn,

                pieces,

                /*
                 * For now carat is represented to three
                 * decimal places in the request.
                 *
                 * The backend step will normalize this into
                 * an integer milli-carat value before storage.
                 */

                carat:
                    carat.toFixed(3),

                ratePaise,

                discountPercent:
                    String(
                        discountPercent
                    ),

                taxPercent:
                    String(
                        taxPercent
                    )
            });
        }
    );


    return {
        valid,
        items:
            preparedItems
    };
}


/* ============================================================
   COMPLETE FORM VALIDATION
   ============================================================ */

function validateForm() {
    clearErrors();
    hideFormMessage();


    let valid = true;


    /* --------------------------------------------------------
       CUSTOMER
       -------------------------------------------------------- */

    const customer =
        selectedCustomer();


    if (!customer) {
        if (
            elements.saleCustomerIdError
        ) {
            elements.saleCustomerIdError.textContent =
                "Select a customer.";
        }

        valid = false;
    } else if (
        customer.active === false
    ) {
        if (
            elements.saleCustomerIdError
        ) {
            elements.saleCustomerIdError.textContent =
                "This customer is inactive.";
        }

        valid = false;
    }


    /* --------------------------------------------------------
       INVOICE DATE
       -------------------------------------------------------- */

    const invoiceDateValue =
        elements.saleInvoiceDate
            ?.value ?? "";

    const invoiceDate =
        parseDateInput(
            invoiceDateValue
        );


    if (!invoiceDate) {
        if (
            elements.saleInvoiceDateError
        ) {
            elements.saleInvoiceDateError.textContent =
                "Select a valid invoice date.";
        }

        valid = false;
    }


    /* --------------------------------------------------------
       CASH / CREDIT
       -------------------------------------------------------- */

    const saleType =
        currentSaleType();

    let dueDateValue = null;


    if (saleType === "credit") {
        dueDateValue =
            elements.saleDueDate
                ?.value ?? "";

        const dueDate =
            parseDateInput(
                dueDateValue
            );


        if (!dueDate) {
            if (
                elements.saleDueDateError
            ) {
                elements.saleDueDateError.textContent =
                    "Select the Credit Sell due date.";
            }

            valid = false;
        } else if (
            invoiceDate &&
            dueDate < invoiceDate
        ) {
            if (
                elements.saleDueDateError
            ) {
                elements.saleDueDateError.textContent =
                    "Due date cannot be before the invoice date.";
            }

            valid = false;
        }
    }


    /* --------------------------------------------------------
       ITEMS
       -------------------------------------------------------- */

    const itemValidation =
        validateItems();


    if (!itemValidation.valid) {
        if (
            elements.saleItemsError
        ) {
            elements.saleItemsError.textContent =
                "Complete every diamond item with Material, Description, Pieces, Carat, Rate, valid Discount %, and valid Tax %.";
        }

        valid = false;
    }


    /* --------------------------------------------------------
       ADJUSTMENTS
       -------------------------------------------------------- */

    const discountPaise =
        parseMoneyToPaise(
            elements.saleDiscount
                ?.value ?? "0"
        );


    if (discountPaise === null) {
        if (
            elements.saleDiscountError
        ) {
            elements.saleDiscountError.textContent =
                "Enter a valid discount amount.";
        }

        valid = false;
    }


    const chargesPaise =
        parseMoneyToPaise(
            elements.saleCharges
                ?.value ?? "0"
        );


    if (chargesPaise === null) {
        if (
            elements.saleChargesError
        ) {
            elements.saleChargesError.textContent =
                "Enter a valid charges amount.";
        }

        valid = false;
    }


    const roundOffPaise =
        parseMoneyToPaise(
            elements.saleRoundOff
                ?.value ?? "0",
            {
                allowNegative: true
            }
        );


    if (roundOffPaise === null) {
        if (
            elements.saleRoundOffError
        ) {
            elements.saleRoundOffError.textContent =
                "Enter a valid round-off amount.";
        }

        valid = false;
    }


    /* --------------------------------------------------------
       TOTAL
       -------------------------------------------------------- */

    const totals =
        calculateTotals();


    if (
        totals.grandTotalPaise <= 0
    ) {
        if (
            elements.saleItemsError
        ) {
            elements.saleItemsError.textContent =
                "Invoice total must be greater than zero.";
        }

        valid = false;
    }


    if (
        discountPaise !== null &&
        discountPaise >
            totals.lineGrandTotalPaise +
            (chargesPaise ?? 0) +
            (roundOffPaise ?? 0)
    ) {
        if (
            elements.saleDiscountError
        ) {
            elements.saleDiscountError.textContent =
                "Discount is too large for this invoice.";
        }

        valid = false;
    }


    /* --------------------------------------------------------
       INITIAL PAYMENT
       -------------------------------------------------------- */

    const initialPaymentPaise =
        parseMoneyToPaise(
            elements.saleInitialPayment
                ?.value ?? "0"
        );


    if (initialPaymentPaise === null) {
        if (
            elements.saleInitialPaymentError
        ) {
            elements.saleInitialPaymentError.textContent =
                "Enter a valid receipt amount.";
        }

        valid = false;
    } else {

        if (
            initialPaymentPaise >
            totals.grandTotalPaise
        ) {
            if (
                elements.saleInitialPaymentError
            ) {
                elements.saleInitialPaymentError.textContent =
                    "Initial receipt cannot exceed the invoice total.";
            }

            valid = false;
        }


        if (
            saleType === "cash" &&
            initialPaymentPaise !==
                totals.grandTotalPaise
        ) {
            if (
                elements.saleInitialPaymentError
            ) {
                elements.saleInitialPaymentError.textContent =
                    "Cash Sell must be fully settled.";
            }

            valid = false;
        }
    }


    /* --------------------------------------------------------
       PAYMENT DATE
       -------------------------------------------------------- */

    let paymentDateValue = null;


    if (
        initialPaymentPaise !== null &&
        initialPaymentPaise > 0
    ) {
        paymentDateValue =
            elements.salePaymentDate
                ?.value ?? "";

        const paymentDate =
            parseDateInput(
                paymentDateValue
            );


        if (!paymentDate) {
            if (
                elements.salePaymentDateError
            ) {
                elements.salePaymentDateError.textContent =
                    "Select the receipt date.";
            }

            valid = false;
        }
    }


    /* --------------------------------------------------------
       STOP
       -------------------------------------------------------- */

    if (
        !valid ||
        !customer ||
        !invoiceDate ||
        discountPaise === null ||
        chargesPaise === null ||
        roundOffPaise === null ||
        initialPaymentPaise === null
    ) {
        return null;
    }


    /* --------------------------------------------------------
       REQUEST

       IMPORTANT:
       These totals are preview values only.

       The secure createSale backend will recalculate every
       financial value instead of trusting these numbers.
       -------------------------------------------------------- */

    return {
        customerId:
            customer.id,

        saleType,

        invoiceDate:
            invoiceDateValue,

        dueDate:
            saleType === "credit"
                ? dueDateValue
                : null,

        broker:
            String(
                elements.saleBroker
                    ?.value ?? ""
            ).trim(),

        items:
            itemValidation.items,

        discountPaise,

        chargesPaise,

        roundOffPaise,

        initialPayment: {
            amountPaise:
                initialPaymentPaise,

            paymentDate:
                initialPaymentPaise > 0
                    ? paymentDateValue
                    : null,

            method:
                initialPaymentPaise > 0
                    ? String(
                        elements.salePaymentMethod
                            ?.value ??
                        "cash"
                    )
                    : null,

            reference:
                initialPaymentPaise > 0
                    ? String(
                        elements.salePaymentReference
                            ?.value ??
                        ""
                    ).trim()
                    : ""
        },

        notes:
            String(
                elements.saleNotes
                    ?.value ?? ""
            ).trim(),

        declaration:
            String(
                elements.saleDeclaration
                    ?.value ?? ""
            ).trim()
    };
}


/* ============================================================
   SECURE CREATE SALE
   ============================================================ */

const createSaleCallable =
    httpsCallable(
        functions,
        "createSale"
    );


/* ============================================================
   CLIENT REQUEST ID

   This is an idempotency key.

   If the network fails after the backend has already created
   the invoice, retrying with the same ID allows createSale
   to return the existing invoice instead of creating another.
   ============================================================ */

function createClientRequestId() {
    if (
        globalThis.crypto &&
        typeof globalThis.crypto.randomUUID ===
            "function"
    ) {
        return globalThis.crypto.randomUUID();
    }


    /*
     * Compatibility fallback.
     *
     * This value is not a password or authentication token.
     * It only identifies this create request.
     */

    return [
        Date.now().toString(36),

        Math.random()
            .toString(36)
            .slice(2),

        Math.random()
            .toString(36)
            .slice(2)
    ].join("-");
}


function getClientRequestId() {
    if (!state.clientRequestId) {
        state.clientRequestId =
            createClientRequestId();
    }

    return state.clientRequestId;
}


/* ============================================================
   SUBMITTING UI
   ============================================================ */

function setSubmitting(
    submitting,
    {
        draft = false
    } = {}
) {
    state.submitting =
        submitting;


    /*
     * Main Save Sell button.
     */

    if (
        elements.saveSaleButton
    ) {
        elements.saveSaleButton.disabled =
            submitting;
    }


    /*
     * Save Draft button.
     */

    if (
        elements.saveDraftButton
    ) {
        elements.saveDraftButton.disabled =
            submitting;
    }


    /*
     * Top-right Save button.
     */

    if (
        elements.topSaveSaleButton
    ) {
        elements.topSaveSaleButton.disabled =
            submitting;
    }


    /*
     * Spinner inside main Save button.
     */

    if (
        elements.saveSaleSpinner
    ) {
        elements.saveSaleSpinner.hidden =
            !submitting;
    }


    /*
     * Main Save button label.
     */

    if (
        elements.saveSaleButtonText
    ) {
        elements.saveSaleButtonText.textContent =
            submitting
                ? (
                    draft
                        ? "Saving Draft..."
                        : "Saving Sell..."
                )
                : "Save Sell";
    }
}


/* ============================================================
   CALLABLE ERROR MESSAGE
   ============================================================ */

function getCreateSaleErrorMessage(
    error
) {
    const code =
        String(
            error?.code ?? ""
        )
            .replace(
                /^functions\//,
                ""
            );


    switch (code) {

        case "unauthenticated":
            return (
                "Your session has expired. " +
                "Please sign in again."
            );


        case "permission-denied":
            return (
                "You are not authorized to " +
                "create Sell invoices."
            );


        case "invalid-argument":
            return (
                error?.message ||
                "Please check the Sell invoice details."
            );


        case "not-found":
            return (
                error?.message ||
                "The selected customer could not be found."
            );


        case "failed-precondition":
            return (
                error?.message ||
                "This Sell invoice cannot be saved " +
                "in its current state."
            );


        case "already-exists":
            return (
                error?.message ||
                "This Sell request has already been processed."
            );


        case "resource-exhausted":
            return (
                "The billing service is busy. " +
                "Please wait a moment and try again."
            );


        case "unavailable":
            return (
                "The billing service is temporarily unavailable. " +
                "Please try again."
            );


        case "deadline-exceeded":
            return (
                "The request took too long. " +
                "Please try again."
            );


        case "internal":
            return (
                "The Sell invoice could not be saved. " +
                "Please try again."
            );


        default:
            return (
                "The Sell invoice could not be saved. " +
                "Please try again."
            );
    }
}


/* ============================================================
   FOCUS FIRST VALIDATION ERROR
   ============================================================ */

function focusFirstFormError() {
    const candidates = [
        [
            elements.saleCustomerIdError,
            elements.saleCustomerId
        ],

        [
            elements.saleInvoiceDateError,
            elements.saleInvoiceDate
        ],

        [
            elements.saleDueDateError,
            elements.saleDueDate
        ],

        [
            elements.saleItemsError,
            elements.saleItemsBody
                ?.querySelector(
                    "[data-item-id][data-field]"
                )
        ],

        [
            elements.saleDiscountError,
            elements.saleDiscount
        ],

        [
            elements.saleChargesError,
            elements.saleCharges
        ],

        [
            elements.saleRoundOffError,
            elements.saleRoundOff
        ],

        [
            elements.saleInitialPaymentError,
            elements.saleInitialPayment
        ],

        [
            elements.salePaymentDateError,
            elements.salePaymentDate
        ]
    ];


    for (
        const [
            errorElement,
            inputElement
        ]
        of candidates
    ) {
        if (
            errorElement &&
            errorElement.textContent.trim()
        ) {
            inputElement?.focus?.();

            inputElement
                ?.scrollIntoView?.({
                    behavior:
                        "smooth",

                    block:
                        "center"
                });

            return;
        }
    }
}


/* ============================================================
   SAVE SALE

   Browser validation improves UX.

   createSale() performs the authoritative security and
   financial validation on the trusted backend.
   ============================================================ */

async function saveSale({
    saveAsDraft = false
} = {}) {

    /*
     * Prevent double-click submissions.
     */

    if (state.submitting) {
        return;
    }


    /*
     * Run the complete existing form validation.
     */

    const payload =
        validateForm();


    if (!payload) {
        showFormMessage(
            "Please correct the highlighted invoice details.",
            "error"
        );

        focusFirstFormError();

        return;
    }


    /*
     * Do not generate a new request ID on every retry.
     *
     * If the callable succeeds on the server but the browser
     * loses the response, retrying should use the SAME ID.
     */

    const clientRequestId =
        getClientRequestId();


    setSubmitting(
        true,
        {
            draft:
                saveAsDraft
        }
    );


    showFormMessage(
        saveAsDraft
            ? "Saving draft securely..."
            : "Saving Sell invoice securely...",
        "info"
    );


    try {

        /* ----------------------------------------------------
           TRUSTED BACKEND CALL

           No direct Firestore financial write happens here.
           ---------------------------------------------------- */

        const result =
            await createSaleCallable({
                ...payload,

                clientRequestId,

                saveAsDraft
            });


        const data =
            result?.data ?? {};


        const saleId =
            String(
                data.saleId ?? ""
            ).trim();


        const invoiceNumber =
            String(
                data.invoiceNumber ?? ""
            ).trim();


        /*
         * The request completed successfully.
         *
         * Never reuse this idempotency ID for another invoice.
         */

        state.clientRequestId =
            "";


        /*
         * Replace the temporary invoice-number text with the
         * number assigned transactionally by the backend.
         */

        if (
            elements.invoiceNumberPreview &&
            invoiceNumber
        ) {
            elements.invoiceNumberPreview.textContent =
                invoiceNumber;
        }


        /*
         * Success message.
         */

        if (saveAsDraft) {

            showFormMessage(
                invoiceNumber
                    ? (
                        `Draft ${invoiceNumber} ` +
                        "saved successfully."
                    )
                    : "Draft saved successfully.",
                "success"
            );

        } else {

            showFormMessage(
                invoiceNumber
                    ? (
                        `Sell invoice ${invoiceNumber} ` +
                        "saved successfully."
                    )
                    : "Sell invoice saved successfully.",
                "success"
            );
        }


        /*
         * Go to the created Sell invoice.
         *
         * sale.html will become our invoice/detail/print page.
         */

        if (invoiceNumber) {

            window.setTimeout(
                () => {
                    window.location.assign(
                        `/sales/${encodeURIComponent(
                            invoiceNumber
                        )}`
                    );
                },
                450
            );
        }

    } catch (error) {

        console.error(
            saveAsDraft
                ? "Save Sell draft failed:"
                : "Create Sell failed:",
            error
        );


        showFormMessage(
            getCreateSaleErrorMessage(
                error
            ),
            "error"
        );


        /*
         * For authentication/authorization failures, do not
         * leave the admin on a financial-entry screen.
         */

        const code =
            String(
                error?.code ?? ""
            )
                .replace(
                    /^functions\//,
                    ""
                );


        if (
            code === "unauthenticated" ||
            code === "permission-denied"
        ) {
            try {

                await signOut(
                    auth
                );

            } finally {

                window.setTimeout(
                    () => {
                        window.location.replace(
                            "./login.html"
                        );
                    },
                    250
                );
            }
        }

    } finally {

        setSubmitting(
            false
        );
    }
}


/* ============================================================
   FINAL SAVE
   ============================================================ */

async function handleSubmit(event) {
    event.preventDefault();


    await saveSale({
        saveAsDraft: false
    });
}


/* ============================================================
   SAVE DRAFT
   ============================================================ */

async function handleSaveDraft() {

    await saveSale({
        saveAsDraft: true
    });
}


/* ============================================================
   TOP SAVE BUTTON
   ============================================================ */

function handleTopSave() {
    elements.newSaleForm
        ?.requestSubmit();
}


/* ============================================================
   ADJUSTMENT INPUT
   ============================================================ */

function handleAdjustmentInput() {
    renderTotals();
}


/* ============================================================
   INITIAL PAYMENT INPUT
   ============================================================ */

function handleInitialPaymentInput() {
    updatePaymentPreview();

    if (
        elements.saleInitialPaymentError
    ) {
        elements.saleInitialPaymentError.textContent =
            "";
    }
}


/* ============================================================
   DEFAULT DATES
   ============================================================ */

function setDefaultDates() {
    const today =
        dateToInputValue(
            new Date()
        );


    if (
        elements.saleInvoiceDate &&
        !elements.saleInvoiceDate.value
    ) {
        elements.saleInvoiceDate.value =
            today;
    }


    if (
        elements.salePaymentDate &&
        !elements.salePaymentDate.value
    ) {
        elements.salePaymentDate.value =
            today;
    }
}


/* ============================================================
   GLOBAL SEARCH
   ============================================================ */

function normalizeSearch(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function moneySearchValues(paise) {
    if (
        !Number.isSafeInteger(paise)
    ) {
        return [];
    }

    return [
        String(paise),
        String(paise / 100),
        formatMoney(paise)
            .toLowerCase()
    ];
}


function matchesSearch(
    values,
    search
) {
    return values
        .flat()
        .map(normalizeSearch)
        .some(
            (value) =>
                value.includes(search)
        );
}


/* ============================================================
   SEARCH RESULT ROW
   ============================================================ */

function createSearchResult({
    title,
    subtitle,
    href,
    type
}) {
    const link =
        document.createElement(
            "a"
        );

    link.href =
        href;

    link.className =
        "global-search-result-item";


    const text =
        document.createElement(
            "span"
        );


    const strong =
        document.createElement(
            "strong"
        );

    strong.textContent =
        title;


    const small =
        document.createElement(
            "small"
        );

    small.textContent =
        subtitle;


    text.append(
        strong,
        small
    );


    const badge =
        document.createElement(
            "span"
        );

    badge.className =
        "global-search-result-type";

    badge.textContent =
        type;


    link.append(
        text,
        badge
    );


    return link;
}


/* ============================================================
   RENDER SEARCH
   ============================================================ */

function renderGlobalSearch() {
    const search =
        normalizeSearch(
            elements.globalSearchInput
                ?.value
        );


    if (
        !search ||
        search.length < 2
    ) {
        if (
            elements.globalSearchResults
        ) {
            elements.globalSearchResults.hidden =
                true;
        }

        return;
    }


    const results = [];


    /* CUSTOMERS */

    for (
        const customer
        of state.customers
    ) {
        if (
            matchesSearch(
                [
                    customer.name,
                    customer.mobile,
                    customer.email,
                    customer.gstin
                ],
                search
            )
        ) {
            results.push({
                title:
                    customer.name ||
                    "Customer",

                subtitle:
                    customer.mobile ||
                    customer.email ||
                    "Customer account",

                href:
                    customer.customerNumber
                        ? `/customers/${encodeURIComponent(
                            String(customer.customerNumber)
                                .trim()
                                .toUpperCase()
                        )}`
                        : "/customers",

                type:
                    "Customer"
            });
        }
    }


    /* SUPPLIERS */

    for (
        const supplier
        of state.searchSuppliers
    ) {
        if (
            matchesSearch(
                [
                    supplier.name,
                    supplier.mobile,
                    supplier.email,
                    supplier.gstin
                ],
                search
            )
        ) {
            results.push({
                title:
                    supplier.name ||
                    "Supplier",

                subtitle:
                    supplier.mobile ||
                    supplier.email ||
                    "Supplier account",

                href:
                    supplier.supplierNumber
                        ? `/suppliers/${encodeURIComponent(
                            String(supplier.supplierNumber)
                                .trim()
                                .toUpperCase()
                        )}`
                        : "/suppliers",

                type:
                    "Supplier"
            });
        }
    }


    /* SALES */

    for (
        const sale
        of state.sales
    ) {
        if (
            matchesSearch(
                [
                    sale.invoiceNumber,
                    sale.customerSnapshot
                        ?.name,
                    sale.customerSnapshot
                        ?.mobile,
                    sale.status,
                    moneySearchValues(
                        sale.grandTotalPaise
                    ),
                    moneySearchValues(
                        sale.balancePaise
                    )
                ],
                search
            )
        ) {
            results.push({
                title:
                    sale.invoiceNumber ||
                    "Sell Invoice",

                subtitle:
                    sale.customerSnapshot
                        ?.name ||
                    "Sell",

                href:
                    sale.invoiceNumber
                        ? `/sales/${encodeURIComponent(
                            String(sale.invoiceNumber)
                                .trim()
                                .toUpperCase()
                        )}`
                        : "/sales",
                type:
                    "Sell"
            });
        }
    }


    /* PURCHASES */

    for (
        const purchase
        of state.searchPurchases
    ) {
        if (
            matchesSearch(
                [
                    purchase.purchaseNumber,
                    purchase.supplierInvoiceNumber,
                    purchase.supplierSnapshot
                        ?.name,
                    purchase.supplierSnapshot
                        ?.mobile,
                    purchase.status,
                    moneySearchValues(
                        purchase.grandTotalPaise
                    ),
                    moneySearchValues(
                        purchase.balancePaise
                    )
                ],
                search
            )
        ) {
            results.push({
                title:
                    purchase.purchaseNumber ||
                    "Purchase",

                subtitle:
                    purchase.supplierSnapshot
                        ?.name ||
                    purchase
                        .supplierInvoiceNumber ||
                    "Buy",

                href:
                    purchase.purchaseNumber
                        ? `/purchases/${encodeURIComponent(
                            String(purchase.purchaseNumber)
                                .trim()
                                .toUpperCase()
                        )}`
                        : "/purchases",

                type:
                    "Buy"
            });
        }
    }


    const visible =
        results.slice(
            0,
            10
        );


    if (
        !elements.globalSearchResultsContent ||
        !elements.globalSearchResults
    ) {
        return;
    }


    elements.globalSearchResultsContent
        .replaceChildren();


    if (
        visible.length === 0
    ) {
        const empty =
            document.createElement(
                "p"
            );

        empty.className =
            "global-search-empty";

        empty.textContent =
            "No matching records.";

        elements.globalSearchResultsContent
            .appendChild(
                empty
            );
    } else {

        for (
            const result
            of visible
        ) {
            elements.globalSearchResultsContent
                .appendChild(
                    createSearchResult(
                        result
                    )
                );
        }
    }


    elements.globalSearchResults.hidden =
        false;
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function openSidebar() {
    elements.sidebar
        ?.classList.add(
            "open"
        );

    if (
        elements.sidebarOverlay
    ) {
        elements.sidebarOverlay.hidden =
            false;
    }

    elements.mobileMenuButton
        ?.setAttribute(
            "aria-expanded",
            "true"
        );
}


function closeSidebar() {
    elements.sidebar
        ?.classList.remove(
            "open"
        );

    if (
        elements.sidebarOverlay
    ) {
        elements.sidebarOverlay.hidden =
            true;
    }

    elements.mobileMenuButton
        ?.setAttribute(
            "aria-expanded",
            "false"
        );
}


/* ============================================================
   LOGOUT
   ============================================================ */

async function handleLogout() {
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
   PERMISSION ERROR
   ============================================================ */

async function handleListenerError(
    error
) {
    console.error(
        "New Sell listener error:",
        error
    );


    if (
        error?.code ===
            "permission-denied"
    ) {
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
}


/* ============================================================
   COLLECTION HELPER
   ============================================================ */

function businessCollection(name) {
    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        name
    );
}


/* ============================================================
   REALTIME LISTENERS
   ============================================================ */

function startRealtimeListeners() {
    if (state.listenersStarted) {
        return;
    }

    state.listenersStarted =
        true;


    /* --------------------------------------------------------
       CUSTOMERS
       -------------------------------------------------------- */

    state.unsubscribeCustomers =
        onSnapshot(
            query(
                businessCollection(
                    "customers"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(
                    MAX_CUSTOMERS
                )
            ),
            (snapshot) => {
                state.customers =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );

                renderCustomerOptions();
                renderGlobalSearch();
            },
            handleListenerError
        );


    /* --------------------------------------------------------
       SALES
       -------------------------------------------------------- */

    state.unsubscribeSales =
        onSnapshot(
            query(
                businessCollection(
                    "sales"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(
                    MAX_SALES
                )
            ),
            (snapshot) => {
                state.sales =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );

                renderSelectedCustomer();
                renderGlobalSearch();
            },
            handleListenerError
        );


    /* --------------------------------------------------------
       SUPPLIERS FOR GLOBAL SEARCH
       -------------------------------------------------------- */

    state.unsubscribeSuppliers =
        onSnapshot(
            query(
                businessCollection(
                    "suppliers"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(
                    MAX_SEARCH_SUPPLIERS
                )
            ),
            (snapshot) => {
                state.searchSuppliers =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );

                renderGlobalSearch();
            },
            handleListenerError
        );


    /* --------------------------------------------------------
       PURCHASES FOR GLOBAL SEARCH
       -------------------------------------------------------- */

    state.unsubscribePurchases =
        onSnapshot(
            query(
                businessCollection(
                    "purchases"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(
                    MAX_SEARCH_PURCHASES
                )
            ),
            (snapshot) => {
                state.searchPurchases =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );

                renderGlobalSearch();
            },
            handleListenerError
        );
}


/* ============================================================
   AUTH
   ============================================================ */

function initializeAuthentication() {
    onAuthStateChanged(
        auth,
        (user) => {
            if (!user) {
                window.location.replace(
                    "/login"
                );

                return;
            }

            startRealtimeListeners();
        }
    );
}


/* ============================================================
   BIND ITEMS
   ============================================================ */

function bindItems() {
    elements.addSaleItemButton
        ?.addEventListener(
            "click",
            () => {
                addItem();
            }
        );


    elements.mobileAddItemButton
        ?.addEventListener(
            "click",
            () => {
                addItem();

                elements.saleItemsBody
                    ?.closest(
                        ".sale-items-table-wrap"
                    )
                    ?.scrollIntoView({
                        behavior:
                            "smooth",

                        block:
                            "center"
                    });
            }
        );


    elements.saleItemsBody
        ?.addEventListener(
            "input",
            handleItemInput
        );


    elements.saleItemsBody
        ?.addEventListener(
            "click",
            (event) => {
                const button =
                    event.target.closest(
                        "[data-remove-item-id]"
                    );

                if (!button) {
                    return;
                }

                const itemId =
                    Number(
                        button.dataset
                            .removeItemId
                    );

                removeItem(
                    itemId
                );
            }
        );
}


/* ============================================================
   BIND CUSTOMER
   ============================================================ */

function bindCustomer() {
    elements.saleCustomerId
        ?.addEventListener(
            "change",
            () => {
                if (
                    elements.saleCustomerIdError
                ) {
                    elements.saleCustomerIdError.textContent =
                        "";
                }

                renderSelectedCustomer();
            }
        );
}


/* ============================================================
   BIND SALE TYPE
   ============================================================ */

function bindSaleType() {
    elements.saleTypeCash
        ?.addEventListener(
            "change",
            updateSaleTypeUI
        );

    elements.saleTypeCredit
        ?.addEventListener(
            "change",
            updateSaleTypeUI
        );
}


/* ============================================================
   BIND TOTALS
   ============================================================ */

function bindTotals() {
    elements.saleDiscount
        ?.addEventListener(
            "input",
            handleAdjustmentInput
        );

    elements.saleCharges
        ?.addEventListener(
            "input",
            handleAdjustmentInput
        );

    elements.saleRoundOff
        ?.addEventListener(
            "input",
            handleAdjustmentInput
        );

    elements.saleInitialPayment
        ?.addEventListener(
            "input",
            handleInitialPaymentInput
        );
}


/* ============================================================
   BIND FORM
   ============================================================ */

function bindForm() {
    elements.newSaleForm
        ?.addEventListener(
            "submit",
            handleSubmit
        );

    elements.saveDraftButton
        ?.addEventListener(
            "click",
            handleSaveDraft
        );

    elements.topSaveSaleButton
        ?.addEventListener(
            "click",
            handleTopSave
        );
}


/* ============================================================
   BIND NAVIGATION
   ============================================================ */

function bindNavigation() {
    elements.mobileMenuButton
        ?.addEventListener(
            "click",
            () => {
                const open =
                    elements.sidebar
                        ?.classList
                        .contains(
                            "open"
                        );

                if (open) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            }
        );


    elements.sidebarOverlay
        ?.addEventListener(
            "click",
            closeSidebar
        );


    elements.logoutButton
        ?.addEventListener(
            "click",
            handleLogout
        );


    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key ===
                "Escape"
            ) {
                closeSidebar();

                if (
                    elements.globalSearchResults
                ) {
                    elements.globalSearchResults.hidden =
                        true;
                }
            }
        }
    );
}


/* ============================================================
   BIND SEARCH
   ============================================================ */

function bindGlobalSearch() {
    elements.globalSearchInput
        ?.addEventListener(
            "input",
            renderGlobalSearch
        );


    document.addEventListener(
        "click",
        (event) => {
            const searchArea =
                elements.globalSearchInput
                    ?.closest(
                        ".global-search"
                    );

            if (
                searchArea &&
                !searchArea.contains(
                    event.target
                ) &&
                elements.globalSearchResults
            ) {
                elements.globalSearchResults.hidden =
                    true;
            }
        }
    );
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanup() {
    state.unsubscribeCustomers?.();
    state.unsubscribeSales?.();
    state.unsubscribeSuppliers?.();
    state.unsubscribePurchases?.();
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initialize() {
    setCurrentDate();
    setDefaultDates();

    bindNavigation();
    bindGlobalSearch();

    bindCustomer();
    bindSaleType();
    bindItems();
    bindTotals();
    bindForm();


    /*
     * Start with one diamond line.
     */

    addItem({
        focus: false
    });


    updateSaleTypeUI();
    renderTotals();


    /*
     * Invoice number is intentionally NOT predicted by
     * browser JavaScript.
     *
     * OMD-S-xxxx will be assigned transactionally by
     * the backend.
     */

    if (
        elements.invoiceNumberPreview
    ) {
        elements.invoiceNumberPreview.textContent =
            "Assigned securely on save";
    }


    initializeAuthentication();
}


/* ============================================================
   START
   ============================================================ */

initialize();


window.addEventListener(
    "beforeunload",
    cleanup
);