//cariable declarion
let currency_change = "USD";
let currency_url = "";
let currency_rate = 0
const warning_header =
    `<div style="padding: 10px;
text-align: center;
color: #f40;
top: 0px;
background-color: white;
line-height: 1;">You are currently using automatic price converter to Currency you set, the Currency you set price are not guarantee 100% accuracy.</div>`

const timer = ms => new Promise(res => setTimeout(res, ms))

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action === "taobao_currency_choose") {
            location.reload();
        }
    }
);
class CurrencyAPI {
    constructor() {
        this.baseUrl = 'https://api.freecurrencyapi.com/v1/';
        this.headers = {
            apikey: "fca_live_ELSJj5SD57q5MeuvJeSqvWUjdK7jGJabegz4d5G2"
        };
    }

    call(endpoint, params = {}) {
        const paramString = new URLSearchParams({ ...params }).toString();

        return fetch(`${this.baseUrl}${endpoint}?${paramString}`, { headers: this.headers })
            .then(response => response.json())
            .then(data => data);
    }

    status() {
        return this.call('status');
    }

    currencies(params) {
        return this.call('currencies', params);
    }

    latest(params) {
        return this.call('latest', params);
    }

    historical(params) {
        return this.call('historical', params);
    }
}

// Create an instance of the CurrencyAPI class
const currencyApi = new CurrencyAPI();

class MutationObserverManager {
    constructor() {
        this.config = { mode: '', mutatedTargetChildNode: '', mutatedTargetParentNode: '', subtree: false };
        this.foundTargetNode = ''
        this.mutatedTargetParentNode = null
        this.mutatedTargetChildNode = null
        this.subtree = false
    }

    startObserver(callback) {
        const { mode, mutatedTargetChildNode, mutatedTargetParentNode, subtree } = this.config;

        let targetElement = document.querySelector(mutatedTargetParentNode)
        if (targetElement) {
            this.mutatedTargetParentNode = targetElement
            this.mutatedTargetChildNode = mutatedTargetChildNode
            this.subtree = subtree
        } else throw Error(`Element with selector '${mutatedTargetParentNode}' not found.`);

        console.log(`parent: ${mutatedTargetParentNode}, mode: ${mode}, mutatedChild: ${mutatedTargetChildNode}`)

        if (!mode || !mutatedTargetChildNode) {
            console.error('Config for mutationObserverManager is empty. Please provide valid configuration.');
            return -1; // or handle it in another way based on your requirements
        }

        const observer = new MutationObserver((mutationsList, observer) => {
            switch (mode) {
                case 'addedNode':
                    this.foundTargetNode = mutationsList.some(mutation => {

                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            return Array.from(mutation.addedNodes).some(node =>
                                sharedUtility.checkClassNameInChildEl(node, mutatedTargetChildNode)
                            );
                        }
                        return false;
                    });

                    this.stopObserverBeforeDomChanges(observer, callback)
                    break;

                case 'removedNode':
                    this.foundTargetNode = mutationsList.some(mutation =>
                        mutation.type === 'childList' &&
                        Array.from(mutation.removedNodes).some(node =>
                            sharedUtility.checkClassNameInChildEl(node, mutatedTargetChildNode)

                        )
                    );

                    this.stopObserverBeforeDomChanges(observer, callback)
                    break;

                case 'removedText':
                    this.foundTargetNode = mutationsList.some(mutation =>
                        mutation.type === 'childList' &&
                        Array.from(mutation.removedNodes).some(node =>
                            node.nodeName.includes('text') || node.nodeName.includes('comment')
                        )
                    );

                    this.stopObserverBeforeDomChanges(observer, callback)

                    break;
                default:
            }

        });

        observer.observe(targetElement, { childList: true, subtree });


    }

    stopObserverBeforeDomChanges(observer, callback) {
        observer.disconnect()

        if (this.foundTargetNode) {
            callback()
        }
        observer.observe(this.mutatedTargetParentNode, { childList: true, subtree: this.subtree });
    }
}

const mutObserverManager = new MutationObserverManager();

getCurrencyRate();
async function getCurrencyRate() {
    try {
        let storageData = await chrome.storage.sync.get({
            selected_target_currency: 'MYR',
            last_update_time: 0, // Default to 0 if not set
            stored_currency_rate: 0     // Default to 0 if not set
        })
        let { selected_target_currency, last_update_time, stored_currency_rate } = storageData
        currency_change = selected_target_currency;

        const current_time = new Date().getTime();
        const thirty_minutes_in_millis = 30 * 60 * 1000;

        if (current_time - last_update_time < thirty_minutes_in_millis || (currency_rate === 0 && stored_currency_rate === 0)) {
            // If more than 30 minutes have passed or stored_currency_rate is not set, query the API
            const response = await currencyApi.latest({
                base_currency: 'CNY',
                currencies: currency_change
            });

            const { data } = response || null;
            currency_rate = data[currency_change];

            // Save the new currency rate and update time in storage
            await chrome.storage.sync.set({ stored_currency_rate: currency_rate, last_update_time: current_time });
        } else {
            // If less than 30 minutes have passed, or if stored_currency_rate is set, use the stored currency rate
            currency_rate = stored_currency_rate;
        }


    } catch (error) {
        console.error('Error fetching currency data:', error);
    }

}

class sharedUtilities {
    constructor() {

    }

    /**
     * Find element / dom entities by class name or the tag
     * @param {string} element The iteration object from querySelectorAll
     * @param {any} class_name class name u want to look for
     * @param {any} element_tag the tag u want to look for, example <div> <p>
     * @returns
     */
    findParentElbyClassName(element, class_name, element_tag) {
        let lowerCaseClassName = class_name.toLowerCase();
        element_tag = element_tag || '*';

        while (element && element.tagName !== 'HTML') {
            const matchingElement = Array.from(element.getElementsByTagName(element_tag)).find(el => {
                return typeof el.className === 'string' && el.className.toLowerCase().includes(lowerCaseClassName);
            });

            if (matchingElement) {
                return matchingElement;
            }

            element = element.parentNode;
        }

        return null; // Return null if no matching element is found in the ancestors
    }

    checkClassNameInChildEl(element, class_name) {
        if (element.className && typeof element.className === 'string' && element.className.includes(class_name)) {
            return true;
        }

        if (element.childNodes.length > 0) {
            return Array.from(element.childNodes).some(child =>
                child.nodeType === 1 && this.checkClassNameInChildEl(child, class_name)
            );
        }

        return false;
    }

    createPriceBox(item_price_element, class_name) {
        const item_price = item_price_element.textContent

        if (item_price.includes("-")) {
            const original_price_arr = item_price.split("-");
            const new_price_tag = `<div class="${class_name}"><i></i><span>≈ ${(parseFloat(original_price_arr[0].substring(1)) * currency_rate).toFixed(2)} - ${(parseFloat(original_price_arr[1]) * currency_rate).toFixed(2)} ${currency_change}</span></div>`;
            item_price_element.lastElementChild.insertAdjacentHTML('afterend', new_price_tag);
        } else {
            const original_price = parseFloat(item_price.substring(1));
            const converted_price = (original_price * currency_rate).toFixed(2);
            const newPriceTagHtml = `<div class="${class_name}"><i></i><span>≈ ${converted_price} ${currency_change}</span></div>`;
            item_price_element.lastElementChild.insertAdjacentHTML('afterend', newPriceTagHtml);
        }
    }

    removeTrailingTaoConvPricebox(parentNode) {
        const target_selector = parentNode ? `${parentNode} .taoconvert_pricebox_tag` : '.taoconvert_pricebox_tag'
        const trailing_taoconv_pricebox = document.querySelectorAll(target_selector)
        if (trailing_taoconv_pricebox.length > 0)
            trailing_taoconv_pricebox.forEach(tag => tag.remove())
    }
}

const sharedUtility = new sharedUtilities()

/////////////////////////////////////[https://world.taobao.com/]/////////////////////////////////////
//effect only content in taobao home page
if (location.href.includes("https://world.taobao.com/")) {
    let lastProcessedIndex = 0; // Variable to keep track of the last processed index

    window.onload = (event) => {
        mutObserverManager.config = { mode: 'addedNode', mutatedTargetChildNode: 'item', mutatedTargetParentNode: '.item-feed .list' }
        mutObserverManager.startObserver(addConversionPrice);
        addConversionPrice();
    };

    function addConversionPrice() {
        let price_elements = document.querySelectorAll(".price-text");

        for (let [index, item] of price_elements.entries()) {
            if (index >= lastProcessedIndex) {
                let symbolTextElement = item.previousElementSibling;

                // Remove extra symbol span
                if (symbolTextElement && symbolTextElement.classList.contains("symbol-text")) {
                    symbolTextElement.remove()
                }

                // Change the font size of .price-text
                item.style.fontSize = "15px";

                let original_price = parseFloat(item.textContent);
                if (!isNaN(original_price)) {
                    let converted_price = (original_price * currency_rate).toFixed(2);
                    item.textContent = '¥ ' + item.textContent + " or " + converted_price + " " + currency_change;
                }
            }
        }

        // Update the last processed index
        lastProcessedIndex = price_elements.length;
    }


}


/////////////////////////////////////[https://s.taobao.com/]/////////////////////////////////////
//effect only in taobao search page
if (location.href.includes("https://s.taobao.com/")) {
    let RightAdsObserverManager;
    let BottomAdsObserverManager;

    let searchResultPageDivToObserve = 'div[class*="leftContent"] div[class*="contentInner"]'
    let RightAdsPageDivToObserve = 'div[class^="RightLay--rightWrap"] [class*="templet"]'
    let BottomAdsPageDivToObserve = 'div[class^="BottomLay--bottomWrap"] [class*="templet"]'

    window.onload = (event) => {
        mutObserverManager.config = { mode: 'addedNode', mutatedTargetChildNode: "doubleCardWrapper", mutatedTargetParentNode: searchResultPageDivToObserve }
        mutObserverManager.startObserver(changeTaobaoSearchResultPagePriceTag)

        // Bottom ads load the last, so need different observer for it even though shares the same div structure and elements
        BottomAdsObserverManager = new MutationObserverManager()
        BottomAdsObserverManager.config = { mode: 'addedNode', mutatedTargetChildNode: "line1", mutatedTargetParentNode: BottomAdsPageDivToObserve }
        BottomAdsObserverManager.startObserver(changeTaobaoSearchResultPageAdsPriceTag)

        changeTaobaoSearchResultPageAdsPriceTag()
        changeTaobaoSearchResultPagePriceTag()
    }

    async function changeTaobaoSearchResultPagePriceTag() {
        let price_wrapper_elements = document.querySelectorAll('[class*="priceWrapper"]');

        for (let price_wrapper_element of price_wrapper_elements) {
            // get Price int and float using more generic selectors
            let price_int_element = sharedUtility.findParentElbyClassName(price_wrapper_element, 'priceInt')
            if (!price_int_element) console.log('no element');

            let price_float_element = sharedUtility.findParentElbyClassName(price_wrapper_element, 'priceFloat')
            if (!price_float_element) console.log('no element');

            // Extract the text content of priceInt and priceFloat elements
            let price_int = parseFloat(price_int_element.textContent)
            let price_float = parseFloat(price_float_element.textContent) || 0

            // Combine priceInt and priceFloat into one number
            let original_price = price_int + price_float / 100; // Assuming priceFloat represents cents

            if (!isNaN(original_price)) {
                let converted_price = (original_price * currency_rate).toFixed(2);

                let ancestor = price_wrapper_element.closest('a');
                ancestor.style.height = "420px"

                price_int_element.style.fontSize = "17px"
                price_float_element.style.fontSize = "17px"
                price_wrapper_element.style.height = "44px"
                price_wrapper_element.style['align-items'] = "flex-start"

                let priceSalesSpan = sharedUtility.findParentElbyClassName(price_wrapper_element, 'realSales')
                priceSalesSpan.style["line-height"] = "20px"

                price_wrapper_element.classList.add('taoconvert_pricebox_container')
                price_float_element.insertAdjacentHTML('afterend', '<div class="taoconvert_pricebox_tag sm"><i></i><span> ≈ ' + converted_price + ' ' + currency_change + '</span></div>');

            }
        }

    }

    function changeTaobaoSearchResultPageAdsPriceTag() {
        let ads_price_wrapper = document.querySelectorAll('.templet ul.item-list li.item');

        // As bottom ads is the last to load, right ads will be rendered first with pricebox, remove it then reprocess with last call
        sharedUtility.removeTrailingTaoConvPricebox(RightAdsPageDivToObserve)

        for (let item of ads_price_wrapper) {
            const ad_price_element = sharedUtility.findParentElbyClassName(item, 'price', 'a')
            const ad_price_wrapper_element = sharedUtility.findParentElbyClassName(item, 'line1', 'div')

            if (!ad_price_element) {
                console.error(`ad_price_element not found`);
                break;
            } else if (ad_price_element) {

                let original_ad_price = ad_price_element.textContent

                // Use a regular expression to match numbers with or without a decimal point
                var matches = original_ad_price.match(/\d+(\.\d+)?|\.\d+/);

                // Check if there are matches and extract the first one
                original_ad_price = matches ? parseFloat(matches[0]) : NaN;

                let converted_price = (original_ad_price * currency_rate).toFixed(2);
                ad_price_element.style["font-size"] = '15px'
                ad_price_wrapper_element.style["height"] = '23px'

                ad_price_element.classList.add('taoconvert_pricebox_container')
                ad_price_element.innerHTML += '<div class="taoconvert_pricebox_tag sm"><i></i><span> ≈ ' + converted_price + ' ' + currency_change + '</span></div>';

            }
        }


    }
}


/////////////////////////////////////[https://item.taobao.com/]/////////////////////////////////////
//Affected only in taobao item page
if (location.href.includes("https://item.taobao.com/")) {
    const itemPageDivToObserve = "#J_StrPrice .tb-rmb-num"

    window.onload = () => {
        mutObserverManager.config = { mode: 'removedText', mutatedTargetChildNode: "tb-rmb-num", mutatedTargetParentNode: itemPageDivToObserve }
        searchResultPageObserverIndex = mutObserverManager.startObserver(changeTaobaoItemPagePriceTag)
        changeTaobaoItemPagePriceTag()
    }

    function changeTaobaoItemPagePriceTag() {
        sharedUtility.removeTrailingTaoConvPricebox()

        const promo_price_element = document.querySelector('strong.tb-promo-price')
        const original_price_element = document.getElementById('J_StrPrice')

        if (promo_price_element) {
            sharedUtility.createPriceBox(promo_price_element, "taoconvert_pricebox_tag")
            sharedUtility.createPriceBox(original_price_element, "taoconvert_pricebox_tag md")
        } else
            sharedUtility.createPriceBox(original_price_element, "taoconvert_pricebox_tag lg")
    }
}


/////////////////////////////////////[https://detail.tmall.com]/////////////////////////////////////
//effect only in taobao item detail tmall page
const urlPattern = /^https?:\/\/(.*\.)?detail\.tmall\.com/;

if (urlPattern.test(location.href)) {
    //if this component load start the script
    const TmallPageDivToObserve = "[class*='originPrice']"

    window.onload = () => {
        mutObserverManager.config = { mode: 'removedText', mutatedTargetChildNode: "[class*='priceText']", mutatedTargetParentNode: TmallPageDivToObserve, subtree: true }
        searchResultPageObserverIndex = mutObserverManager.startObserver(changeTmallPagePriceTag)
        changeTmallPagePriceTag()
    }

    function changeTmallPagePriceTag() {
        sharedUtility.removeTrailingTaoConvPricebox()

        let tmall_price_elements = document.querySelectorAll("[class^='Price--priceText']")
        let tmall_discounted_price_element;
        let tmall_original_price_element;

        Array.from(tmall_price_elements).forEach(el => {
            const discountedPriceElement = sharedUtility.findParentElbyClassName(el, "extraPrice");
            const originalPriceElement = sharedUtility.findParentElbyClassName(el, "originPrice");

            if (discountedPriceElement) {
                tmall_discounted_price_element = discountedPriceElement;
            }

            if (originalPriceElement) {
                tmall_original_price_element = originalPriceElement;
            }
        });


        if (tmall_discounted_price_element) {
            let tmall_price = tmall_discounted_price_element.textContent
            const converted_price = (parseFloat(tmall_price) * currency_rate).toFixed(2);
            const newPriceTagHtml = `<div class="taoconvert_pricebox_tag"><i></i><span>≈ ${converted_price} ${currency_change}</span></div>`;

            const salePriceRelativeWrapElement = tmall_discounted_price_element.closest('[class^="Price--sale--"]')
            salePriceRelativeWrapElement.style["margin-bottom"] = '10px'

            salePriceRelativeWrapElement.insertAdjacentHTML('afterend', newPriceTagHtml);

        } else {
            let tmall_price = tmall_original_price_element.textContent
            // Use a regular expression to match numbers with or without a decimal point
            var matches = tmall_price.match(/\d+(\.\d+)?|\.\d+/);

            // Check if there are matches and extract the first one
            tmall_price = matches ? parseFloat(matches[0]) : NaN;
            const converted_price = (tmall_price * currency_rate).toFixed(2);
            const newPriceTagHtml = `<div class="taoconvert_pricebox_tag"><i></i><span>≈ ${converted_price} ${currency_change}</span></div>`;
            tmall_original_price_element.style["margin-right"] = '10px'


            //let salePriceRelativeWrapElement = tmall_original_price_element.closest('[class*="salePriceRelativeWrap"]')
            let priceSaleParentElement = tmall_original_price_element.closest('[class^="Price--sale--"]')
            let normalPriceWrapParentElement = tmall_original_price_element.closest('[class^="Price--priceWrap--"]')

            let selectedWrapperElement = priceSaleParentElement ? priceSaleParentElement : normalPriceWrapParentElement

            selectedWrapperElement.style["margin-bottom"] = '10px'
            selectedWrapperElement.insertAdjacentHTML('afterend', newPriceTagHtml);

        }

    }
}