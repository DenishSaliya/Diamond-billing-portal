/* ============================================================
   OM MARUTI DIAMOND
   NEW PURCHASE / BUY PAGE
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
   CONFIG
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";

const MAX_SEARCH_RESULTS =
    12;

const MAX_ITEMS =
    100;


/* ============================================================
   STATE
   ============================================================ */

const state = {
    authenticated: false,

    submitting: false,

    suppliers: [],
    customers: [],
    sales: [],
    purchases: [],

    items: [],

    nextItemId: 1,

    clientRequestId:
        createClientRequestId(),

    unsubscribeSuppliers: null,
    unsubscribeCustomers: null,
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

    topSavePurchaseButton:
        document.getElementById(
            "topSavePurchaseButton"
        ),

    purchaseNumberPreview:
        document.getElementById(
            "purchaseNumberPreview"
        ),

    form:
        document.getElementById(
            "newPurchaseForm"
        ),

    purchaseSupplierId:
        document.getElementById(
            "purchaseSupplierId"
        ),

    purchaseSupplierIdError:
        document.getElementById(
            "purchaseSupplierIdError"
        ),

    purchaseDate:
        document.getElementById(
            "purchaseDate"
        ),

    purchaseDateError:
        document.getElementById(
            "purchaseDateError"
        ),

    supplierInvoiceNumber:
        document.getElementById(
            "supplierInvoiceNumber"
        ),

    purchaseTypeCash:
        document.getElementById(
            "purchaseTypeCash"
        ),

    purchaseTypeCredit:
        document.getElementById(
            "purchaseTypeCredit"
        ),

    purchaseDueDateField:
        document.getElementById(
            "purchaseDueDateField"
        ),

    purchaseDueDate:
        document.getElementById(
            "purchaseDueDate"
        ),

    purchaseDueDateError:
        document.getElementById(
            "purchaseDueDateError"
        ),

    purchaseBroker:
        document.getElementById(
            "purchaseBroker"
        ),

    selectedSupplierPreview:
        document.getElementById(
            "selectedSupplierPreview"
        ),

    selectedSupplierName:
        document.getElementById(
            "selectedSupplierName"
        ),

    selectedSupplierStatus:
        document.getElementById(
            "selectedSupplierStatus"
        ),

    selectedSupplierMobile:
        document.getElementById(
            "selectedSupplierMobile"
        ),

    selectedSupplierEmail:
        document.getElementById(
            "selectedSupplierEmail"
        ),

    selectedSupplierGstin:
        document.getElementById(
            "selectedSupplierGstin"
        ),

    selectedSupplierPayable:
        document.getElementById(
            "selectedSupplierPayable"
        ),

    selectedSupplierAddress:
        document.getElementById(
            "selectedSupplierAddress"
        ),

    addPurchaseItemButton:
        document.getElementById(
            "addPurchaseItemButton"
        ),

    mobileAddItemButton:
        document.getElementById(
            "mobileAddItemButton"
        ),

    purchaseItemsBody:
        document.getElementById(
            "purchaseItemsBody"
        ),

    purchaseItemsError:
        document.getElementById(
            "purchaseItemsError"
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

    purchaseDiscount:
        document.getElementById(
            "purchaseDiscount"
        ),

    purchaseDiscountError:
        document.getElementById(
            "purchaseDiscountError"
        ),

    purchaseCharges:
        document.getElementById(
            "purchaseCharges"
        ),

    purchaseChargesError:
        document.getElementById(
            "purchaseChargesError"
        ),

    purchaseRoundOff:
        document.getElementById(
            "purchaseRoundOff"
        ),

    purchaseRoundOffError:
        document.getElementById(
            "purchaseRoundOffError"
        ),

    previousBalanceValue:
        document.getElementById(
            "previousBalanceValue"
        ),

    purchaseSubtotalValue:
        document.getElementById(
            "purchaseSubtotalValue"
        ),

    purchaseTaxValue:
        document.getElementById(
            "purchaseTaxValue"
        ),

    purchaseDiscountValue:
        document.getElementById(
            "purchaseDiscountValue"
        ),

    purchaseChargesValue:
        document.getElementById(
            "purchaseChargesValue"
        ),

    purchaseRoundOffValue:
        document.getElementById(
            "purchaseRoundOffValue"
        ),

    purchaseGrandTotalValue:
        document.getElementById(
            "purchaseGrandTotalValue"
        ),

    purchaseAmountWords:
        document.getElementById(
            "purchaseAmountWords"
        ),

    purchasePaymentHelp:
        document.getElementById(
            "purchasePaymentHelp"
        ),

    paymentPurchaseTotal:
        document.getElementById(
            "paymentPurchaseTotal"
        ),

    paymentPaidPreview:
        document.getElementById(
            "paymentPaidPreview"
        ),

    paymentBalancePreview:
        document.getElementById(
            "paymentBalancePreview"
        ),

    purchaseInitialPayment:
        document.getElementById(
            "purchaseInitialPayment"
        ),

    purchaseInitialPaymentError:
        document.getElementById(
            "purchaseInitialPaymentError"
        ),

    purchasePaymentDate:
        document.getElementById(
            "purchasePaymentDate"
        ),

    purchasePaymentDateError:
        document.getElementById(
            "purchasePaymentDateError"
        ),

    purchasePaymentMethod:
        document.getElementById(
            "purchasePaymentMethod"
        ),

    purchasePaymentReference:
        document.getElementById(
            "purchasePaymentReference"
        ),

    purchaseNotes:
        document.getElementById(
            "purchaseNotes"
        ),

    purchaseDeclaration:
        document.getElementById(
            "purchaseDeclaration"
        ),

    purchaseFormMessage:
        document.getElementById(
            "purchaseFormMessage"
        ),

    saveDraftButton:
        document.getElementById(
            "saveDraftButton"
        ),

    savePurchaseButton:
        document.getElementById(
            "savePurchaseButton"
        ),

    savePurchaseButtonText:
        document.getElementById(
            "savePurchaseButtonText"
        ),

    savePurchaseSpinner:
        document.getElementById(
            "savePurchaseSpinner"
        ),

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


function createClientRequestId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
            "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        "purchase-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 12)
    );
}


function safePaise(value) {
    return Number.isSafeInteger(
        value
    )
        ? value
        : 0;
}

function getSupplierNumberForNewPurchase() {

    const supplierNumber =
        String(
            sessionStorage.getItem(
                "omdNewPurchaseSupplierNumber"
            ) ??
            ""
        )
            .trim()
            .toUpperCase();


    return supplierNumber;
}


function findSupplierByPublicNumber(
    supplierNumber
) {

    const target =
        String(
            supplierNumber ||
            ""
        )
            .trim()
            .toUpperCase();


    if (!target) {
        return null;
    }


    return (
        state.suppliers.find(
            (supplier) =>
                String(
                    supplier.supplierNumber ||
                    ""
                )
                    .trim()
                    .toUpperCase() ===
                target
        ) ||
        null
    );
}




function applyPreselectedSupplier() {

    const supplierNumber =
        getSupplierNumberForNewPurchase();

    if (!supplierNumber) {
        return;
    }

    console.log(
        "[New Buy] Requested supplier:",
        supplierNumber
    );

    console.log(
        "[New Buy] Loaded suppliers:",
        state.suppliers.length
    );

    const supplier =
        findSupplierByPublicNumber(
            supplierNumber
        );

    if (!supplier) {

        console.warn(
            "[New Buy] Supplier not found:",
            supplierNumber
        );

        console.table(
            state.suppliers.map(
                (item) => ({
                    supplierNumber:
                        item.supplierNumber,
                    name:
                        item.name
                })
            )
        );

        /*
         * Keep the value for diagnosis.
         * Do not silently delete it.
         */
        return;
    }

    const select =
        elements.purchaseSupplierId;

    if (!select) {

        console.error(
            "[New Buy] Missing #purchaseSupplierId"
        );

        return;
    }

    const matchingOption =
        Array.from(
            select.options
        ).find(
            (option) =>
                option.value === supplier.id
        );

    if (!matchingOption) {

        console.error(
            "[New Buy] Supplier option missing:",
            supplier.id
        );

        return;
    }

    select.value =
        supplier.id;

    select.dispatchEvent(
        new Event(
            "change",
            {
                bubbles: true
            }
        )
    );

    renderSelectedSupplier();

    console.log(
        "[New Buy] Supplier selected:",
        supplier.supplierNumber,
        supplier.name
    );

    sessionStorage.removeItem(
        "omdNewPurchaseSupplierNumber"
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
    value,
    {
        allowNegative = false
    } = {}
) {
    const raw =
        text(value)
            .replace(/,/g, "")
            .trim();

    if (!raw) {
        return 0;
    }

    if (
        !/^-?\d+(?:\.\d{0,2})?$/.test(
            raw
        )
    ) {
        return null;
    }

    const number =
        Number(raw);

    if (
        !Number.isFinite(number)
    ) {
        return null;
    }

    if (
        !allowNegative &&
        number < 0
    ) {
        return null;
    }

    const paise =
        Math.round(
            number * 100
        );

    return Number.isSafeInteger(
        paise
    )
        ? paise
        : null;
}


/* ============================================================
   DECIMAL HELPERS
   ============================================================ */

function parsePositiveInteger(
    value
) {
    const raw =
        text(value).trim();

    if (
        !/^\d+$/.test(raw)
    ) {
        return null;
    }

    const number =
        Number(raw);

    if (
        !Number.isSafeInteger(
            number
        ) ||
        number <= 0
    ) {
        return null;
    }

    return number;
}


function parsePositiveDecimal(
    value
) {
    const raw =
        text(value)
            .replace(/,/g, "")
            .trim();

    if (!raw) {
        return null;
    }

    const number =
        Number(raw);

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return null;
    }

    return number;
}


function parsePercent(value) {
    const raw =
        text(value)
            .replace(/,/g, "")
            .trim();

    if (!raw) {
        return 0;
    }

    const number =
        Number(raw);

    if (
        !Number.isFinite(number) ||
        number < 0 ||
        number > 100
    ) {
        return null;
    }

    return number;
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


function parseDateInput(value) {
    const raw =
        text(value).trim();

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            raw
        )
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] =
        raw
            .split("-")
            .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !==
            month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
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

function numberBelowThousandToWords(
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
            numberBelowThousandToWords(
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
            numberBelowThousandToWords(
                thousand
            ),
            "Thousand"
        );

        value %=
            1000;
    }

    if (value) {
        parts.push(
            numberBelowThousandToWords(
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

    const remainingPaise =
        safe % 100;

    let result =
        `${integerToIndianWords(
            rupees
        )} Rupees`;

    if (
        remainingPaise > 0
    ) {
        result +=
            ` and ${integerToIndianWords(
                remainingPaise
            )} Paise`;
    }

    return `${result} Only`;
}


/* ============================================================
   FIRESTORE HELPERS
   ============================================================ */

function businessCollection(
    collectionName
) {
    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        collectionName
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
   SUPPLIER HELPERS
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


function supplierDisplayName(
    supplier
) {
    return (
        text(
            supplier?.name
        ).trim() ||
        text(
            supplier?.businessName
        ).trim() ||
        "Supplier"
    );
}


function getSupplierPayable(
    supplierId
) {
    let payable = 0;

    state.purchases.forEach(
        (purchase) => {
            if (
                purchase.supplierId ===
                supplierId
            ) {
                payable +=
                    Math.max(
                        0,
                        safePaise(
                            purchase.balancePaise
                        )
                    );
            }
        }
    );

    return payable;
}


/* ============================================================
   POPULATE SUPPLIER SELECT
   ============================================================ */

function renderSupplierOptions() {
    if (
        !elements.purchaseSupplierId
    ) {
        return;
    }

    const previousValue =
        elements.purchaseSupplierId
            .value;

    elements.purchaseSupplierId
        .replaceChildren();

    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value = "";
    placeholder.textContent =
        "Select supplier";

    elements.purchaseSupplierId
        .appendChild(
            placeholder
        );

    const sorted =
        [...state.suppliers]
            .sort(
                (a, b) =>
                    supplierDisplayName(a)
                        .localeCompare(
                            supplierDisplayName(b)
                        )
            );

    sorted.forEach(
        (supplier) => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                supplier.id;

            option.textContent =
                supplierDisplayName(
                    supplier
                );

            elements.purchaseSupplierId
                .appendChild(
                    option
                );
        }
    );

    if (
        previousValue &&
        findSupplier(
            previousValue
        )
    ) {
        elements.purchaseSupplierId
            .value =
            previousValue;
    }

    renderSelectedSupplier();
}


/* ============================================================
   SELECTED SUPPLIER
   ============================================================ */

function renderSelectedSupplier() {
    const supplier =
        findSupplier(
            elements.purchaseSupplierId
                ?.value
        );

    if (!supplier) {
        if (
            elements.selectedSupplierPreview
        ) {
            elements.selectedSupplierPreview
                .hidden =
                true;
        }

        if (
            elements.previousBalanceValue
        ) {
            elements.previousBalanceValue
                .textContent =
                formatMoney(0);
        }

        return;
    }

    if (
        elements.selectedSupplierPreview
    ) {
        elements.selectedSupplierPreview
            .hidden =
            false;
    }

    if (
        elements.selectedSupplierName
    ) {
        elements.selectedSupplierName
            .textContent =
            supplierDisplayName(
                supplier
            );
    }

    if (
        elements.selectedSupplierStatus
    ) {
        elements.selectedSupplierStatus
            .textContent =
            supplier.active === false
                ? "Inactive"
                : "Active";
    }

    if (
        elements.selectedSupplierMobile
    ) {
        elements.selectedSupplierMobile
            .textContent =
            text(
                supplier.mobile
            ).trim() ||
            "—";
    }

    if (
        elements.selectedSupplierEmail
    ) {
        elements.selectedSupplierEmail
            .textContent =
            text(
                supplier.email
            ).trim() ||
            "—";
    }

    if (
        elements.selectedSupplierGstin
    ) {
        elements.selectedSupplierGstin
            .textContent =
            text(
                supplier.gstin
            ).trim() ||
            "—";
    }

    if (
        elements.selectedSupplierAddress
    ) {
        elements.selectedSupplierAddress
            .textContent =
            text(
                supplier.address
            ).trim() ||
            "—";
    }

    const payable =
        getSupplierPayable(
            supplier.id
        );

    if (
        elements.selectedSupplierPayable
    ) {
        elements.selectedSupplierPayable
            .textContent =
            formatMoney(
                payable
            );
    }

    if (
        elements.previousBalanceValue
    ) {
        elements.previousBalanceValue
            .textContent =
            formatMoney(
                payable
            );
    }
}


/* ============================================================
   PURCHASE TYPE
   ============================================================ */

function getPurchaseType() {
    return document.querySelector(
        'input[name="purchaseType"]:checked'
    )?.value === "credit"
        ? "credit"
        : "cash";
}


function updatePurchaseTypeUI() {
    const purchaseType =
        getPurchaseType();

    const isCredit =
        purchaseType ===
        "credit";

    if (
        elements.purchaseDueDateField
    ) {
        elements.purchaseDueDateField
            .hidden =
            !isCredit;
    }

    if (
        elements.purchaseDueDate
    ) {
        elements.purchaseDueDate
            .required =
            isCredit;

        if (!isCredit) {
            elements.purchaseDueDate
                .value =
                "";

            elements.purchaseDueDate
                .removeAttribute(
                    "aria-invalid"
                );
        }
    }

    if (
        !isCredit &&
        elements.purchaseDueDateError
    ) {
        elements.purchaseDueDateError
            .textContent =
            "";
    }

    if (
        elements.purchasePaymentHelp
    ) {
        elements.purchasePaymentHelp
            .textContent =
            isCredit
                ? "Credit Buy may be unpaid, partially paid or fully paid."
                : "Cash Buy must be fully settled.";
    }

    updatePaymentForPurchaseType();
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

function calculateItem(
    item
) {
    const pieces =
        parsePositiveInteger(
            item.pieces
        );

    const carat =
        parsePositiveDecimal(
            item.carat
        );

    const ratePaise =
        parseMoneyToPaise(
            item.rate
        );

    const discountPercent =
        parsePercent(
            item.discountPercent
        );

    const taxPercent =
        parsePercent(
            item.taxPercent
        );

    if (
        pieces === null ||
        carat === null ||
        ratePaise === null ||
        ratePaise <= 0 ||
        discountPercent === null ||
        taxPercent === null
    ) {
        return {
            valid: false,

            pieces:
                pieces ?? 0,

            carat:
                carat ?? 0,

            ratePaise:
                ratePaise ?? 0,

            grossAmountPaise:
                0,

            discountPaise:
                0,

            amountPaise:
                0,

            taxPaise:
                0,

            totalPaise:
                0
        };
    }

    const grossAmountPaise =
        Math.round(
            ratePaise *
            carat
        );

    const discountPaise =
        Math.round(
            grossAmountPaise *
            discountPercent /
            100
        );

    const amountPaise =
        Math.max(
            0,
            grossAmountPaise -
            discountPaise
        );

    const taxPaise =
        Math.round(
            amountPaise *
            taxPercent /
            100
        );

    const totalPaise =
        amountPaise +
        taxPaise;

    return {
        valid:
            amountPaise > 0,

        pieces,
        carat,
        ratePaise,

        grossAmountPaise,
        discountPaise,
        amountPaise,
        taxPaise,
        totalPaise
    };
}


/* ============================================================
   ITEM INPUT
   ============================================================ */

function createItemInput({
    item,
    field,
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
        text(
            item[field]
        );

    input.placeholder =
        placeholder;

    input.inputMode =
        inputMode;

    input.autocomplete =
        "off";

    input.className =
        (
            "purchase-item-input " +
            className
        ).trim();

    input.dataset.itemId =
        String(
            item.id
        );

    input.dataset.field =
        field;

    return input;
}


function createCell() {
    return document.createElement(
        "td"
    );
}


/* ============================================================
   RENDER ITEMS
   ============================================================ */

function renderItems() {
    if (
        !elements.purchaseItemsBody
    ) {
        return;
    }

    elements.purchaseItemsBody
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

            row.dataset.itemId =
                String(
                    item.id
                );


            /* SERIAL */

            const serialCell =
                createCell();

            serialCell.className =
                "purchase-item-serial";

            serialCell.textContent =
                String(
                    index + 1
                );

            row.appendChild(
                serialCell
            );


            /* MATERIAL */

            const materialCell =
                createCell();

            materialCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "material",
                    placeholder:
                        "Diamond"
                })
            );

            row.appendChild(
                materialCell
            );


            /* DESCRIPTION */

            const descriptionCell =
                createCell();

            descriptionCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "description",
                    placeholder:
                        "RD/VVS/VS/D-F..."
                })
            );

            row.appendChild(
                descriptionCell
            );


            /* REMARKS */

            const remarksCell =
                createCell();

            remarksCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "remarks",
                    placeholder:
                        "Optional"
                })
            );

            row.appendChild(
                remarksCell
            );


            /* HSN */

            const hsnCell =
                createCell();

            hsnCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "hsn",
                    placeholder:
                        "7102",
                    inputMode:
                        "numeric"
                })
            );

            row.appendChild(
                hsnCell
            );


            /* PIECES */

            const piecesCell =
                createCell();

            piecesCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "pieces",
                    placeholder:
                        "0",
                    inputMode:
                        "numeric",
                    className:
                        "purchase-item-number"
                })
            );

            row.appendChild(
                piecesCell
            );


            /* CARAT */

            const caratCell =
                createCell();

            caratCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "carat",
                    placeholder:
                        "0.000",
                    inputMode:
                        "decimal",
                    className:
                        "purchase-item-number"
                })
            );

            row.appendChild(
                caratCell
            );


            /* RATE */

            const rateCell =
                createCell();

            rateCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "rate",
                    placeholder:
                        "0.00",
                    inputMode:
                        "decimal",
                    className:
                        "purchase-item-number"
                })
            );

            row.appendChild(
                rateCell
            );


            /* DISCOUNT % */

            const discountCell =
                createCell();

            discountCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "discountPercent",
                    placeholder:
                        "0",
                    inputMode:
                        "decimal",
                    className:
                        "purchase-item-number"
                })
            );

            row.appendChild(
                discountCell
            );


            /* AMOUNT */

            const amountCell =
                createCell();

            amountCell.className =
                "purchase-item-money";

            amountCell.textContent =
                formatMoney(
                    calculation
                        .amountPaise
                );

            row.appendChild(
                amountCell
            );


            /* TAX % */

            const taxPercentCell =
                createCell();

            taxPercentCell.appendChild(
                createItemInput({
                    item,
                    field:
                        "taxPercent",
                    placeholder:
                        "0",
                    inputMode:
                        "decimal",
                    className:
                        "purchase-item-number"
                })
            );

            row.appendChild(
                taxPercentCell
            );


            /* TAX */

            const taxCell =
                createCell();

            taxCell.className =
                "purchase-item-money";

            taxCell.textContent =
                formatMoney(
                    calculation
                        .taxPaise
                );

            row.appendChild(
                taxCell
            );


            /* TOTAL */

            const totalCell =
                createCell();

            totalCell.className =
                "purchase-item-money";

            totalCell.textContent =
                formatMoney(
                    calculation
                        .totalPaise
                );

            row.appendChild(
                totalCell
            );


            /* REMOVE */

            const removeCell =
                createCell();

            const removeButton =
                document.createElement(
                    "button"
                );

            removeButton.type =
                "button";

            removeButton.className =
                "purchase-item-remove";

            removeButton.dataset.action =
                "remove-item";

            removeButton.dataset.itemId =
                String(
                    item.id
                );

            removeButton.setAttribute(
                "aria-label",
                `Remove item ${index + 1}`
            );

            removeButton.textContent =
                "×";

            removeButton.disabled =
                state.items.length <= 1;

            removeCell.appendChild(
                removeButton
            );

            row.appendChild(
                removeCell
            );


            elements.purchaseItemsBody
                .appendChild(
                    row
                );
        }
    );

    renderTotals();
}


/* ============================================================
   ADD / REMOVE ITEM
   ============================================================ */

function addItem() {
    if (
        state.items.length >=
        MAX_ITEMS
    ) {
        if (
            elements.purchaseItemsError
        ) {
            elements.purchaseItemsError
                .textContent =
                `Maximum ${MAX_ITEMS} items allowed.`;
        }

        return;
    }

    state.items.push(
        createEmptyItem()
    );

    if (
        elements.purchaseItemsError
    ) {
        elements.purchaseItemsError
            .textContent =
            "";
    }

    renderItems();
}


function removeItem(
    itemId
) {
    if (
        state.items.length <= 1
    ) {
        return;
    }

    state.items =
        state.items.filter(
            (item) =>
                item.id !==
                itemId
        );

    renderItems();
}


/* ============================================================
   ITEM EVENTS
   ============================================================ */

function handleItemInput(
    event
) {
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
            (record) =>
                record.id ===
                itemId
        );

    if (!item) {
        return;
    }

    item[field] =
        input.value;

    renderTotals();

    const row =
        input.closest("tr");

    if (!row) {
        return;
    }

    const calculation =
        calculateItem(
            item
        );

    const cells =
        row.children;

    if (
        cells.length >= 13
    ) {
        cells[9].textContent =
            formatMoney(
                calculation
                    .amountPaise
            );

        cells[11].textContent =
            formatMoney(
                calculation
                    .taxPaise
            );

        cells[12].textContent =
            formatMoney(
                calculation
                    .totalPaise
            );
    }
}


function handleItemClick(
    event
) {
    const button =
        event.target.closest(
            '[data-action="remove-item"]'
        );

    if (!button) {
        return;
    }

    removeItem(
        Number(
            button.dataset.itemId
        )
    );
}


/* ============================================================
   TOTAL CALCULATION
   ============================================================ */

function calculateTotals() {
    let totalPieces = 0;
    let totalCarat = 0;

    let subtotalPaise = 0;
    let taxPaise = 0;
    let lineGrandTotalPaise = 0;

    state.items.forEach(
        (item) => {
            const calculation =
                calculateItem(
                    item
                );

            totalPieces +=
                calculation.pieces;

            totalCarat +=
                calculation.carat;

            subtotalPaise +=
                calculation.amountPaise;

            taxPaise +=
                calculation.taxPaise;

            lineGrandTotalPaise +=
                calculation.totalPaise;
        }
    );

    const discountPaise =
        parseMoneyToPaise(
            elements.purchaseDiscount
                ?.value ?? "0"
        );

    const chargesPaise =
        parseMoneyToPaise(
            elements.purchaseCharges
                ?.value ?? "0"
        );

    const roundOffPaise =
        parseMoneyToPaise(
            elements.purchaseRoundOff
                ?.value ?? "0",
            {
                allowNegative:
                    true
            }
        );

    const safeDiscount =
        discountPaise ?? 0;

    const safeCharges =
        chargesPaise ?? 0;

    const safeRoundOff =
        roundOffPaise ?? 0;

    const grandTotalPaise =
        lineGrandTotalPaise -
        safeDiscount +
        safeCharges +
        safeRoundOff;

    return {
        totalPieces,
        totalCarat,

        subtotalPaise,
        taxPaise,
        lineGrandTotalPaise,

        discountPaise:
            safeDiscount,

        chargesPaise:
            safeCharges,

        roundOffPaise:
            safeRoundOff,

        grandTotalPaise:
            Math.max(
                0,
                grandTotalPaise
            )
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
        elements.itemsTotalPieces
            .textContent =
            String(
                totals.totalPieces
            );
    }

    if (
        elements.itemsTotalCarat
    ) {
        elements.itemsTotalCarat
            .textContent =
            totals.totalCarat
                .toFixed(3);
    }

    if (
        elements.itemsTotalAmount
    ) {
        elements.itemsTotalAmount
            .textContent =
            formatMoney(
                totals.subtotalPaise
            );
    }

    if (
        elements.itemsTotalTax
    ) {
        elements.itemsTotalTax
            .textContent =
            formatMoney(
                totals.taxPaise
            );
    }

    if (
        elements.itemsGrandLineTotal
    ) {
        elements.itemsGrandLineTotal
            .textContent =
            formatMoney(
                totals
                    .lineGrandTotalPaise
            );
    }

    if (
        elements.purchaseSubtotalValue
    ) {
        elements.purchaseSubtotalValue
            .textContent =
            formatMoney(
                totals.subtotalPaise
            );
    }

    if (
        elements.purchaseTaxValue
    ) {
        elements.purchaseTaxValue
            .textContent =
            formatMoney(
                totals.taxPaise
            );
    }

    if (
        elements.purchaseDiscountValue
    ) {
        elements.purchaseDiscountValue
            .textContent =
            `− ${formatMoney(
                totals.discountPaise
            )}`;
    }

    if (
        elements.purchaseChargesValue
    ) {
        elements.purchaseChargesValue
            .textContent =
            formatMoney(
                totals.chargesPaise
            );
    }

    if (
        elements.purchaseRoundOffValue
    ) {
        elements.purchaseRoundOffValue
            .textContent =
            formatMoney(
                totals.roundOffPaise
            );
    }

    if (
        elements.purchaseGrandTotalValue
    ) {
        elements.purchaseGrandTotalValue
            .textContent =
            formatMoney(
                totals.grandTotalPaise
            );
    }

    if (
        elements.purchaseAmountWords
    ) {
        elements.purchaseAmountWords
            .textContent =
            amountToWords(
                totals.grandTotalPaise
            );
    }

    updatePaymentForPurchaseType();
}


/* ============================================================
   PAYMENT PREVIEW
   ============================================================ */

function updatePaymentForPurchaseType() {
    const totals =
        calculateTotals();

    const purchaseType =
        getPurchaseType();

    let paidPaise = 0;

    if (
        purchaseType === "cash"
    ) {
        paidPaise =
            totals.grandTotalPaise;

        if (
            elements.purchaseInitialPayment
        ) {
            elements.purchaseInitialPayment
                .value =
                (
                    paidPaise /
                    100
                ).toFixed(2);

            elements.purchaseInitialPayment
                .readOnly =
                true;
        }
    } else {
        if (
            elements.purchaseInitialPayment
        ) {
            elements.purchaseInitialPayment
                .readOnly =
                false;

            const parsed =
                parseMoneyToPaise(
                    elements
                        .purchaseInitialPayment
                        .value
                );

            paidPaise =
                parsed === null
                    ? 0
                    : Math.min(
                        parsed,
                        totals.grandTotalPaise
                    );
        }
    }

    const balancePaise =
        Math.max(
            0,
            totals.grandTotalPaise -
            paidPaise
        );

    if (
        elements.paymentPurchaseTotal
    ) {
        elements.paymentPurchaseTotal
            .textContent =
            formatMoney(
                totals.grandTotalPaise
            );
    }

    if (
        elements.paymentPaidPreview
    ) {
        elements.paymentPaidPreview
            .textContent =
            formatMoney(
                paidPaise
            );
    }

    if (
        elements.paymentBalancePreview
    ) {
        elements.paymentBalancePreview
            .textContent =
            formatMoney(
                balancePaise
            );
    }
}


/* ============================================================
   CLEAR VALIDATION
   ============================================================ */

function clearValidation() {
    const errorElements = [
        elements.purchaseSupplierIdError,
        elements.purchaseDateError,
        elements.purchaseDueDateError,
        elements.purchaseItemsError,
        elements.purchaseDiscountError,
        elements.purchaseChargesError,
        elements.purchaseRoundOffError,
        elements.purchaseInitialPaymentError,
        elements.purchasePaymentDateError
    ];

    errorElements.forEach(
        (element) => {
            if (element) {
                element.textContent =
                    "";
            }
        }
    );

    [
        elements.purchaseSupplierId,
        elements.purchaseDate,
        elements.purchaseDueDate,
        elements.purchaseInitialPayment,
        elements.purchasePaymentDate
    ].forEach(
        (element) => {
            element?.removeAttribute(
                "aria-invalid"
            );
        }
    );
}


/* ============================================================
   VALIDATE ITEMS
   ============================================================ */

function validateItems() {
    if (
        state.items.length === 0
    ) {
        return false;
    }

    return state.items.every(
        (item) => {
            const material =
                text(
                    item.material
                ).trim();

            const description =
                text(
                    item.description
                ).trim();

            const calculation =
                calculateItem(
                    item
                );

            return (
                Boolean(material) &&
                Boolean(description) &&
                calculation.valid
            );
        }
    );
}


/* ============================================================
   BUILD REQUEST
   ============================================================ */

function buildPurchaseRequest(
    saveAsDraft
) {
    clearValidation();

    let valid =
        true;

    const supplierId =
        elements.purchaseSupplierId
            ?.value
            .trim() || "";

    const supplier =
        findSupplier(
            supplierId
        );

    if (!supplier) {
        if (
            elements.purchaseSupplierIdError
        ) {
            elements.purchaseSupplierIdError
                .textContent =
                "Select a supplier.";
        }

        elements.purchaseSupplierId
            ?.setAttribute(
                "aria-invalid",
                "true"
            );

        valid =
            false;
    } else if (
        supplier.active === false
    ) {
        if (
            elements.purchaseSupplierIdError
        ) {
            elements.purchaseSupplierIdError
                .textContent =
                "The selected supplier is inactive.";
        }

        valid =
            false;
    }


    /* PURCHASE DATE */

    const purchaseDateValue =
        elements.purchaseDate
            ?.value || "";

    const purchaseDate =
        parseDateInput(
            purchaseDateValue
        );

    if (!purchaseDate) {
        if (
            elements.purchaseDateError
        ) {
            elements.purchaseDateError
                .textContent =
                "Select the purchase date.";
        }

        elements.purchaseDate
            ?.setAttribute(
                "aria-invalid",
                "true"
            );

        valid =
            false;
    }


    /* CASH / CREDIT */

    const purchaseType =
        getPurchaseType();

    let dueDateValue =
        null;

    if (
        purchaseType === "credit"
    ) {
        dueDateValue =
            elements.purchaseDueDate
                ?.value || "";

        if (!dueDateValue) {
            if (
                elements.purchaseDueDateError
            ) {
                elements.purchaseDueDateError
                    .textContent =
                    "Due date is required for Credit Buy.";
            }

            elements.purchaseDueDate
                ?.setAttribute(
                    "aria-invalid",
                    "true"
                );

            valid =
                false;
        } else if (
            purchaseDateValue &&
            dueDateValue <
                purchaseDateValue
        ) {
            if (
                elements.purchaseDueDateError
            ) {
                elements.purchaseDueDateError
                    .textContent =
                    "Due date cannot be before the purchase date.";
            }

            elements.purchaseDueDate
                ?.setAttribute(
                    "aria-invalid",
                    "true"
                );

            valid =
                false;
        }
    }


    /* ITEMS */

    if (
        !validateItems()
    ) {
        if (
            elements.purchaseItemsError
        ) {
            elements.purchaseItemsError
                .textContent =
                "Complete every item with material, diamond details, pieces, carat and rate.";
        }

        valid =
            false;
    }


    /* ADJUSTMENTS */

    const discountPaise =
        parseMoneyToPaise(
            elements.purchaseDiscount
                ?.value ?? "0"
        );

    if (
        discountPaise === null
    ) {
        elements.purchaseDiscountError
            .textContent =
            "Enter a valid discount amount.";

        valid =
            false;
    }

    const chargesPaise =
        parseMoneyToPaise(
            elements.purchaseCharges
                ?.value ?? "0"
        );

    if (
        chargesPaise === null
    ) {
        elements.purchaseChargesError
            .textContent =
            "Enter a valid charges amount.";

        valid =
            false;
    }

    const roundOffPaise =
        parseMoneyToPaise(
            elements.purchaseRoundOff
                ?.value ?? "0",
            {
                allowNegative:
                    true
            }
        );

    if (
        roundOffPaise === null
    ) {
        elements.purchaseRoundOffError
            .textContent =
            "Enter a valid round-off amount.";

        valid =
            false;
    }


    /* TOTAL */

    const totals =
        calculateTotals();

    if (
        totals.grandTotalPaise <= 0
    ) {
        elements.purchaseItemsError
            .textContent =
            "Purchase total must be greater than zero.";

        valid =
            false;
    }

    if (
        discountPaise !== null &&
        chargesPaise !== null &&
        discountPaise >
            totals.lineGrandTotalPaise +
            chargesPaise
    ) {
        elements.purchaseDiscountError
            .textContent =
            "Discount is too large for this purchase.";

        valid =
            false;
    }


    /* INITIAL PAYMENT */

    let initialPaymentPaise =
        parseMoneyToPaise(
            elements.purchaseInitialPayment
                ?.value ?? "0"
        );

    if (
        initialPaymentPaise === null
    ) {
        elements.purchaseInitialPaymentError
            .textContent =
            "Enter a valid payment amount.";

        valid =
            false;
    }

    if (
        initialPaymentPaise !== null &&
        initialPaymentPaise >
            totals.grandTotalPaise
    ) {
        elements.purchaseInitialPaymentError
            .textContent =
            "Initial payment cannot exceed the purchase total.";

        valid =
            false;
    }

    if (
        !saveAsDraft &&
        purchaseType === "cash" &&
        initialPaymentPaise !==
            totals.grandTotalPaise
    ) {
        elements.purchaseInitialPaymentError
            .textContent =
            "Cash Buy must be fully settled.";

        valid =
            false;
    }


    /* PAYMENT DATE */

    let paymentDateValue =
        null;

    if (
        !saveAsDraft &&
        initialPaymentPaise !== null &&
        initialPaymentPaise > 0
    ) {
        paymentDateValue =
            elements.purchasePaymentDate
                ?.value || "";

        if (
            !parseDateInput(
                paymentDateValue
            )
        ) {
            elements.purchasePaymentDateError
                .textContent =
                "Select the payment date.";

            valid =
                false;
        }
    }


    if (
        !valid ||
        !supplier ||
        !purchaseDate ||
        discountPaise === null ||
        chargesPaise === null ||
        roundOffPaise === null ||
        initialPaymentPaise === null
    ) {
        return null;
    }


    /* BACKEND ITEMS */

    const items =
        state.items.map(
            (item) => {
                const ratePaise =
                    parseMoneyToPaise(
                        item.rate
                    );

                return {
                    material:
                        text(
                            item.material
                        ).trim(),

                    description:
                        text(
                            item.description
                        ).trim(),

                    remarks:
                        text(
                            item.remarks
                        ).trim(),

                    hsn:
                        text(
                            item.hsn
                        ).trim(),

                    pieces:
                        Number(
                            item.pieces
                        ),

                    carat:
                        text(
                            item.carat
                        ).trim(),

                    ratePaise,

                    discountPercent:
                        text(
                            item.discountPercent ||
                            "0"
                        ).trim(),

                    taxPercent:
                        text(
                            item.taxPercent ||
                            "0"
                        ).trim()
                };
            }
        );


    /* REQUEST */

    return {
        clientRequestId:
            state.clientRequestId,

        supplierId,

        supplierInvoiceNumber:
            elements.supplierInvoiceNumber
                ?.value
                .trim() || "",

        purchaseType,

        purchaseDate:
            purchaseDateValue,

        dueDate:
            purchaseType === "credit"
                ? dueDateValue
                : null,

        broker:
            elements.purchaseBroker
                ?.value
                .trim() || "",

        items,

        discountPaise,

        chargesPaise,

        roundOffPaise,

        notes:
            elements.purchaseNotes
                ?.value
                .trim() || "",

        declaration:
            elements.purchaseDeclaration
                ?.value
                .trim() || "",

        saveAsDraft:
            Boolean(
                saveAsDraft
            ),

        initialPayment:
            saveAsDraft
                ? {
                    amountPaise:
                        0
                }
                : {
                    amountPaise:
                        purchaseType ===
                        "cash"
                            ? totals
                                .grandTotalPaise
                            : initialPaymentPaise,

                    paymentDate:
                        paymentDateValue,

                    method:
                        elements.purchasePaymentMethod
                            ?.value ||
                        "cash",

                    reference:
                        elements.purchasePaymentReference
                            ?.value
                            .trim() ||
                        ""
                }
    };
}


/* ============================================================
   FORM MESSAGE
   ============================================================ */

function showFormMessage(
    message,
    type = "error"
) {
    if (
        !elements.purchaseFormMessage
    ) {
        return;
    }

    elements.purchaseFormMessage
        .hidden =
        false;

    elements.purchaseFormMessage
        .textContent =
        message;

    elements.purchaseFormMessage
        .dataset.type =
        type;
}


function hideFormMessage() {
    if (
        !elements.purchaseFormMessage
    ) {
        return;
    }

    elements.purchaseFormMessage
        .hidden =
        true;

    elements.purchaseFormMessage
        .textContent =
        "";

    delete elements
        .purchaseFormMessage
        .dataset.type;
}


/* ============================================================
   SUBMIT STATE
   ============================================================ */

function setSubmitting(
    submitting
) {
    state.submitting =
        submitting;

    if (
        elements.savePurchaseButton
    ) {
        elements.savePurchaseButton
            .disabled =
            submitting;
    }

    if (
        elements.saveDraftButton
    ) {
        elements.saveDraftButton
            .disabled =
            submitting;
    }

    if (
        elements.topSavePurchaseButton
    ) {
        elements.topSavePurchaseButton
            .disabled =
            submitting;
    }

    if (
        elements.savePurchaseSpinner
    ) {
        elements.savePurchaseSpinner
            .hidden =
            !submitting;
    }

    if (
        elements.savePurchaseButtonText
    ) {
        elements.savePurchaseButtonText
            .textContent =
            submitting
                ? "Saving..."
                : "Save Buy";
    }
}


/* ============================================================
   FIREBASE ERROR MESSAGE
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
        "Unable to save the purchase. Please try again."
    );
}


/* ============================================================
   SAVE PURCHASE
   ============================================================ */

async function savePurchase(
    saveAsDraft = false
) {
    if (
        state.submitting
    ) {
        return;
    }

    hideFormMessage();

    const request =
        buildPurchaseRequest(
            saveAsDraft
        );

    if (!request) {
        showFormMessage(
            "Please fix the highlighted fields before saving."
        );

        return;
    }

    setSubmitting(
        true
    );

    try {
        const createPurchase =
            httpsCallable(
                functions,
                "createPurchase"
            );

        const response =
            await createPurchase(
                request
            );

        const result =
            response?.data || {};

        if (
            !result.success ||
            !result.purchaseId
        ) {
            throw new Error(
                result.message ||
                "The purchase could not be created."
            );
        }

        showFormMessage(
            result.message ||
            (
                saveAsDraft
                    ? "Buy draft created successfully."
                    : "Buy purchase created successfully."
            ),
            "success"
        );

        const purchaseNumber =
            text(
                result.purchaseNumber
            )
                .trim()
                .toUpperCase();


        if (purchaseNumber) {

            window.location.href =
                `/purchases/${encodeURIComponent(
                    purchaseNumber
                )}`;

            return;
        }


        window.location.href =
            "/purchases";
    } catch (error) {
        console.error(
            "Create purchase failed:",
            error
        );

        showFormMessage(
            readableFirebaseError(
                error
            )
        );
    } finally {
        setSubmitting(
            false
        );
    }
}


/* ============================================================
   GLOBAL SEARCH HELPERS
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


function getSalePartyName(
    sale
) {
    const snapshotName =
        text(
            sale.customerSnapshot
                ?.name
        ).trim();

    if (snapshotName) {
        return snapshotName;
    }

    const customer =
        state.customers.find(
            (record) =>
                record.id ===
                sale.customerId
        );

    return (
        text(
            customer?.name
        ).trim() ||
        "Customer"
    );
}


function getPurchasePartyName(
    purchase
) {
    const snapshotName =
        text(
            purchase.supplierSnapshot
                ?.name
        ).trim();

    if (snapshotName) {
        return snapshotName;
    }

    const supplier =
        findSupplier(
            purchase.supplierId
        );

    return supplier
        ? supplierDisplayName(
            supplier
        )
        : "Supplier";
}


function getDisplayStatus(
    record,
    balance,
    total
) {
    if (
        record?.status ===
        "draft"
    ) {
        return "Draft";
    }

    if (
        record?.status ===
        "cancelled"
    ) {
        return "Cancelled";
    }

    if (
        total > 0 &&
        balance <= 0
    ) {
        return "Paid";
    }

    if (
        balance > 0
    ) {
        const paid =
            Math.max(
                0,
                total - balance
            );

        return paid > 0
            ? "Partially Paid"
            : "Pending";
    }

    return "Pending";
}


/* ============================================================
   GLOBAL SEARCH RESULTS
   ============================================================ */

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
            if (
                containsSearch(
                    search,
                    supplier.supplierNumber,
                    supplier.name,
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
                        supplierDisplayName(
                            supplier
                        ),

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
            const total =
                safePaise(
                    sale.grandTotalPaise
                );

            const balance =
                safePaise(
                    sale.balancePaise
                );

            const status =
                getDisplayStatus(
                    sale,
                    balance,
                    total
                );

            const party =
                getSalePartyName(
                    sale
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
                    status,
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
                        )} · ${status}`,

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

            const status =
                getDisplayStatus(
                    purchase,
                    balance,
                    total
                );

            const party =
                getPurchasePartyName(
                    purchase
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
                    status,
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
                        )} · ${status}`,

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
   HIDE GLOBAL SEARCH
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


/* ============================================================
   RENDER GLOBAL SEARCH
   ============================================================ */

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
        document
            .createDocumentFragment();

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
   DATA LISTENERS
   ============================================================ */

function startDataListeners() {
    if (
        state.unsubscribeSuppliers
    ) {
        return;
    }


    /* SUPPLIERS */

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


                renderSupplierOptions();


                applyPreselectedSupplier();

                refreshSearchIfOpen();
            },

            (error) => {
                console.error(
                    "Suppliers listener failed:",
                    error
                );
            }
        );


    /* CUSTOMERS */

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
                    "Customers listener failed:",
                    error
                );
            }
        );


    /* SALES */

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
                    "Sales listener failed:",
                    error
                );
            }
        );


    /* PURCHASES */

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

                renderSelectedSupplier();

                refreshSearchIfOpen();
            },

            (error) => {
                console.error(
                    "Purchases listener failed:",
                    error
                );
            }
        );
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanupListeners() {
    [
        "unsubscribeSuppliers",
        "unsubscribeCustomers",
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
    if (!elements.sidebar) {
        return;
    }

    elements.sidebar
        .classList
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
   LOGOUT
   ============================================================ */

async function handleLogout() {
    if (
        elements.logoutButton
    ) {
        elements.logoutButton
            .disabled =
            true;
    }

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

        if (
            elements.logoutButton
        ) {
            elements.logoutButton
                .disabled =
                false;
        }
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


    /* SUPPLIER */

    elements.purchaseSupplierId
        ?.addEventListener(
            "change",
            () => {
                if (
                    elements
                        .purchaseSupplierIdError
                ) {
                    elements
                        .purchaseSupplierIdError
                        .textContent =
                        "";
                }

                renderSelectedSupplier();
            }
        );


    /* PURCHASE TYPE */

    elements.purchaseTypeCash
        ?.addEventListener(
            "change",
            updatePurchaseTypeUI
        );

    elements.purchaseTypeCredit
        ?.addEventListener(
            "change",
            updatePurchaseTypeUI
        );


    /* PURCHASE DATE */

    elements.purchaseDate
        ?.addEventListener(
            "change",
            () => {
                if (
                    elements.purchaseDate
                        .value &&
                    elements.purchaseDueDate
                ) {
                    elements.purchaseDueDate
                        .min =
                        elements.purchaseDate
                            .value;
                }

                if (
                    elements.purchaseDateError
                ) {
                    elements.purchaseDateError
                        .textContent =
                        "";
                }
            }
        );


    /* DUE DATE */

    elements.purchaseDueDate
        ?.addEventListener(
            "change",
            () => {
                if (
                    elements.purchaseDueDateError
                ) {
                    elements.purchaseDueDateError
                        .textContent =
                        "";
                }
            }
        );


    /* ITEMS */

    elements.addPurchaseItemButton
        ?.addEventListener(
            "click",
            addItem
        );

    elements.mobileAddItemButton
        ?.addEventListener(
            "click",
            addItem
        );

    elements.purchaseItemsBody
        ?.addEventListener(
            "input",
            handleItemInput
        );

    elements.purchaseItemsBody
        ?.addEventListener(
            "click",
            handleItemClick
        );


    /* ADJUSTMENTS */

    [
        elements.purchaseDiscount,
        elements.purchaseCharges,
        elements.purchaseRoundOff
    ].forEach(
        (element) => {
            element?.addEventListener(
                "input",
                renderTotals
            );
        }
    );


    /* PAYMENT */

    elements.purchaseInitialPayment
        ?.addEventListener(
            "input",
            () => {
                if (
                    getPurchaseType() ===
                    "credit"
                ) {
                    updatePaymentForPurchaseType();
                }

                if (
                    elements
                        .purchaseInitialPaymentError
                ) {
                    elements
                        .purchaseInitialPaymentError
                        .textContent =
                        "";
                }
            }
        );


    /* FORM */

    elements.form
        ?.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                savePurchase(
                    false
                );
            }
        );

    elements.topSavePurchaseButton
        ?.addEventListener(
            "click",
            () => {
                savePurchase(
                    false
                );
            }
        );

    elements.saveDraftButton
        ?.addEventListener(
            "click",
            () => {
                savePurchase(
                    true
                );
            }
        );


    /* GLOBAL SEARCH */

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
                event.key ===
                "Escape"
            ) {
                hideSearchResults();

                closeMobileSidebar();
            }
        }
    );


    /* WINDOW */

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
   DEFAULT VALUES
   ============================================================ */

function initializeDefaults() {
    const today =
        todayDateKey();

    if (
        elements.purchaseDate &&
        !elements.purchaseDate.value
    ) {
        elements.purchaseDate
            .value =
            today;
    }

    if (
        elements.purchasePaymentDate &&
        !elements.purchasePaymentDate
            .value
    ) {
        elements.purchasePaymentDate
            .value =
            today;
    }

    if (
        elements.purchaseDueDate &&
        elements.purchaseDate
    ) {
        elements.purchaseDueDate
            .min =
            elements.purchaseDate
                .value;
    }

    if (
        elements.purchaseNumberPreview
    ) {
        elements.purchaseNumberPreview
            .textContent =
            "Assigned securely on save";
    }

    state.items = [
        createEmptyItem()
    ];

    renderItems();

    updatePurchaseTypeUI();
}


/* ============================================================
   AUTH
   ============================================================ */

function startAuthentication() {
    onAuthStateChanged(
        auth,

        (user) => {
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

            startDataListeners();
        },

        (error) => {
            console.error(
                "Authentication check failed:",
                error
            );

            showFormMessage(
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

    initializeDefaults();

    bindEvents();

    startAuthentication();
}


initialize();