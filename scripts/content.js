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

function currencyAPI() {
    const baseUrl = 'https://api.freecurrencyapi.com/v1/';
    const headers = {
        apikey: "fca_live_ELSJj5SD57q5MeuvJeSqvWUjdK7jGJabegz4d5G2"
    };

    return {
        call: function (endpoint, params = {}) {
            const paramString = new URLSearchParams({
                ...params
            }).toString();

            return fetch(`${baseUrl}${endpoint}?${paramString}`, { headers: headers })
                .then(response => response.json())
                .then(data => data);
        },
        status: function () {
            return this.call('status');
        },
        currencies: function (params) {
            return this.call('currencies', params);
        },
        latest: function (params) {
            return this.call('latest', params);
        },
        historical: function (params) {
            return this.call('historical', params);
        }
    };
}

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

        if (current_time - last_update_time > thirty_minutes_in_millis || (currency_rate === 0 && stored_currency_rate === 0)) {
            // If more than 30 minutes have passed or stored_currency_rate is not set, query the API
            const response = await currencyAPI().latest({
                base_currency: 'CNY',
                currencies: currency_change
            });

            const { data } = response;
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

/////////////////////////////////////[https://world.taobao.com/]/////////////////////////////////////
//effect only content in taobao home page
if (location.href.includes("https://world.taobao.com/")) {
    let lastProcessedIndex = 0; // Variable to keep track of the last processed index

    window.onload = (event) => {
        setupMutationObserver()
        addConversionPrice();
    };
    function setupMutationObserver() {
        const observer = new MutationObserver((mutationsList, observer) => {
            console.log('Child elements have changed!');
            addConversionPrice();
        })
        observer.observe(document.querySelector('.item-feed .list'), { childList: true });
    }
    function addConversionPrice() {
        let price_elements = document.querySelectorAll(".price-text");

        Array.from(price_elements).forEach(function (item, index) {

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
        });

        // Update the last processed index
        lastProcessedIndex = price_elements.length;
    }


}


/////////////////////////////////////[https://s.taobao.com/]/////////////////////////////////////
//effect only in taobao search page
if (location.href.includes("https://s.taobao.com/")) {

    window.onload = (event) => {
        setupMutationObserver()
        changeMainPriceTag()
        changeAdsPriceTag()
    };

    function setupMutationObserver() {
        // Observer for main price tags
        const observer1 = new MutationObserver((mutationsList, observer) => {
            changeMainPriceTag();
        });
        const contentInnerElement = document.querySelector('[class*="contentInner"]');
        if (contentInnerElement) {
            observer1.observe(contentInnerElement, { childList: true, subtree: true });
        } else {
            console.error("Element with selector '[class*=\"contentInner\"]' not found.");
        }

        // Observer for ads content
        const observer2 = new MutationObserver((mutationsList) => {

            Array.from(mutationsList).forEach((mutation) => {
                // Check if any of the removed nodes had the .templet class
                const removedNodes = Array.from(mutation.removedNodes);
                const templetRemoved = removedNodes.some(node => node.classList && node.classList.contains('templet'));

                if (mutation.type === 'childList' && templetRemoved) {
                    changeAdsPriceTag()
                }
            })
        });

        const templetContainerElement = document.querySelector('[class*="templet"]');
        if (templetContainerElement) {
            observer2.observe(templetContainerElement, { childList: true, subtree: true });
        } else {
            console.error("Element with selector '.templet' not found.");
        }

    }


    function changeMainPriceTag() {
        let price_wrappers = document.querySelectorAll('[class*="priceWrapper"]');
        Array.from(price_wrappers).forEach(function (item, index) {
            // get Price int and float using more generic selectors
            let price_int_element = findElementbyClassName(item, 'priceInt');
            let price_float_element = findElementbyClassName(item, 'priceFloat') ? findElementbyClassName(item, 'priceFloat') : 0

            // Extract the text content of priceInt and priceFloat elements
            let price_int = parseFloat(price_int_element.textContent)
            let price_float = parseFloat(price_float_element.textContent)

            // Combine priceInt and priceFloat into one number
            let original_price = price_int + price_float / 100; // Assuming priceFloat represents cents

            if (!isNaN(original_price)) {
                let converted_price = (original_price * currency_rate).toFixed(2);

                //Remove not needed elements tag mainly unit and floating numbers
                findElementbyClassName(item, 'price--unit').remove()
                price_float_element.remove()

                // Define a CSS object with multiple properties
                var cssObject = {
                    "font-size": "18px"
                };

                // Use Object.assign to merge the style object with existing styles
                Object.assign(price_int_element.style, cssObject);

                price_int_element.classList.add('taoconvert_pricebox_container')
                price_int_element.innerHTML += '<div class="taoconvert_modified_tag"><i></i><span> ≈ ' + converted_price + ' ' + currency_change + '</span></div>';

            //    price_int_element.textContent = '¥' + price_int_element.textContent + " or " + converted_price + " " + currency_change;
            }
        })
    }

    function changeAdsPriceTag() {
        let ads_price_wrapper = document.querySelectorAll('.templet ul li');

        Array.from(ads_price_wrapper).forEach(function (item, index) {
            let ad_price_element = findElementbyClassName(item, 'price', 'a')

            if (ad_price_element) {
                let original_ad_price = ad_price_element.textContent

                // Use a regular expression to match numbers with or without a decimal point
                var matches = original_ad_price.match(/\d+(\.\d+)?|\.\d+/);

                // Check if there are matches and extract the first one
                original_ad_price = matches ? parseFloat(matches[0]) : NaN;

                let converted_price = (original_ad_price * currency_rate).toFixed(2);

                // Define a CSS object with multiple properties
                var cssObject = {
                    "font-size": "15px"
                };

                // Use Object.assign to merge the style object with existing styles
                Object.assign(ad_price_element.style, cssObject);

                ad_price_element.classList.add('taoconvert_pricebox_container')
                ad_price_element.innerHTML += '<div class="taoconvert_modified_tag min"><i></i><span> ≈ ' + converted_price + ' ' + currency_change + '</span></div>';

            //    ad_price_element.textContent = '¥' + original_ad_price + " or " + converted_price + " " + currency_change;
            }
        })
    }

    /**
     * Find element / dom entities by class name or the tag
     * @param {string} element The iteration object from querySelectorAll
     * @param {any} class_name class name u want to look for
     * @param {any} element_tag the tag u want to look for, example <div> <p>
     * @returns
     */
    function findElementbyClassName(element, class_name, element_tag) {
        let lowerCaseClassName = class_name.toLowerCase();

        element_tag = element_tag || '*'; // Use '*' if element_tag is not provided

        return Array.from(element.getElementsByTagName(element_tag)).find(
            el => el.className.toLowerCase().includes(lowerCaseClassName)
        );

    }
}


/////////////////////////////////////[https://item.taobao.com/]/////////////////////////////////////
//effect only in taobao item detail page
if (location.href.includes("https://item.taobao.com/")) {
    let doneFlag = 0;

    function timer(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function start(loaded) {
        if (doneFlag) {
            return;
        }
        if (loaded) {
            timer(100).then(() => cPriceInItem(document.getElementById('J_StrPrice')));
        } else {
            timer(1000).then(() => cPriceInItem(document.getElementById('J_StrPrice')));
        }
        const promoPrice = document.querySelector('strong.tb-promo-price');
        if (promoPrice) {
            cPriceInItem(promoPrice);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        start(0);
    });

    function clickEventReinitiate() {
        const salePropLinks = document.querySelectorAll('ul.J_TSaleProp a');
        salePropLinks.forEach(link => {
            link.addEventListener('click', async function () {
                await timer(100);
                document.querySelectorAll('.taobao_currency_modified_tag').forEach(tag => tag.remove());
                doneFlag = 0;
                start(1);
            });
        });
    }

    clickEventReinitiate();

    function cPriceInItem(priceTag) {
        try {
            if (priceTag.textContent.trim().length === 0) {
                throw new Error("Empty string");
            }
        } catch (err) {
            start(0);
            return;
        }

        if (priceTag) {
            const outerText = priceTag.textContent;
            if (outerText.includes("-")) {
                const originalPriceArr = outerText.split("-");
                const newPriceTagHtml = `<div class="taobao_currency_modified_tag"><i></i><span>≈ ${(
                    parseFloat(originalPriceArr[0].substring(1)) * currency_rate
                ).toFixed(2)} - ${(parseFloat(originalPriceArr[1]) * currency_rate).toFixed(2)} ${currency_change
                    }</span></div>`;
                priceTag.querySelector('em:last-child').insertAdjacentHTML('afterend', newPriceTagHtml);
                doneFlag = 1;
            } else {
                const originalPrice = parseFloat(outerText.substring(1));
                const usdPrice = (originalPrice * currency_rate).toFixed(2);
                const newPriceTagHtml = `<div class="taobao_currency_modified_tag"><i></i><span>≈ ${usdPrice} ${currency_change
                    }</span></div>`;
                priceTag.querySelector('em:last-child').insertAdjacentHTML('afterend', newPriceTagHtml);
                doneFlag = 1;
            }
        }
    }
}


/////////////////////////////////////[https://detail.tmall.com]/////////////////////////////////////
//effect only in taobao item detail tmall page
if (location.href.includes("https://detail.tmall.com/")) {
    //if this component load start the script
    $("#J_StrPriceModBox dd").ready(function () {
        //align the price tag location
        $("#J_StrPriceModBox dd").css({ "margin-left": "77px" })
        $("#J_PromoPrice dd").css({ "margin-left": "77px" })
        //start the custom price tag
        start(0)
    });

    async function start(loaded) {
        if (loaded) {//1 if the component completely load, call from click
            await timer(100);
        } else {//call from begining
            await timer(1000);
        }
        c_price_initem($("#J_StrPriceModBox dd"))
        if ($("#J_PromoPrice dd .tm-promo-price").length > 0) {
            c_price_initem($("#J_PromoPrice dd .tm-promo-price"))
        }
    }

    function click_event_reinitiate() {
        $("ul.J_TSaleProp a").on('click', async function () {
            // console.log("Clicked----")
            $(".taobao_currency_modified_tag").remove()
            start(1)
        })
    }

    //activate the page change recheck
    click_event_reinitiate()

    async function c_price_initem(price_tag) {
        // console.log(price_tag.get(0).outerText.length)
        try {
            if (price_tag.get(0).outerText.length == 0) {//making sure that no bug
                throw "Empty string"
            }
        }
        catch (err) {
            // console.log("ERROR -- Retry")
            // console.log("Retrying")
            start(0)
        }
        //price tag
        if (price_tag.get(0).outerText.includes("-")) {//handle the price with -//check if the text with -
            var original_price_arr = price_tag.get(0).outerText.split("-")//split by that -
            var new_price_tag_html = `<div class="tm-price taobao_currency_modified_tag">` + "<i></i><span>≈ " + (parseFloat(original_price_arr[0].substring(1)) * currency_rate).toFixed(2) + "-" + (parseFloat(original_price_arr[1]) * currency_rate).toFixed(2) + " " + currency_change + "</span></div>"//the first str was include the cny char
            price_tag.find("span:last").after(new_price_tag_html)//append new price after the old price
        } else {
            var original_price = parseFloat(price_tag.get(0).outerText.substring(1))
            var usd_price = (original_price * currency_rate).toFixed(2)//cal for the usd price
            var new_price_tag_html = `<div class="tm-price taobao_currency_modified_tag">` + "<i></i><span>" + usd_price + " " + currency_change + "</span></div>"//create new price text
            price_tag.find("span:last").after(new_price_tag_html)//append new price after the old price
        }
        /**
         * @todo Custom price tag validation
         * @body Make sure it is not show the duplicate
         */
    }
}