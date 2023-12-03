//cariable declarion
var currency_change = "USD";
var currency_url = "";
var currency_rate = 0 
var warning_header = `
<div style="
padding: 10px;
text-align: center;
color: #f40;
top: 0px;
background-color: white;
line-height: 1;
">You are currently using automatic price converter to Currency you set, the Currency you set price are not guarantee 100% accuracy.</div>`

const timer = ms => new Promise(res => setTimeout(res, ms))


chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
      if (request.action === "taobao_currency_choose") {
        //getCurrencyRate();
        location.reload();
      }
  }
);
getCurrencyRate();
function getCurrencyRate(){
  chrome.storage.sync.get({
    taobao_currency: 'USD'
  }, (data) => {
    currency_change = data.taobao_currency;
    /*currency_url = "https://free.currconv.com/api/v7/convert?q=CNY_"+currency_change+"&compact=ultra&apiKey=fe841eb9786c17692925"
    $.get(currency_url, function(data) {
      $(".result").html(data);
      currency_rate = data['CNY_'+currency_change]
      $("body").prepend(warning_header);
    });*/
    currency_url = "https://api.exchangerate.host/latest?base=CNY&symbols="+currency_change
    $.get(currency_url, function(data) {
      $(".result").html(data);
      currency_rate = data.rates[currency_change]
      $("body").prepend(warning_header);
    });
  });

}

/////////////////////////////////////[https://world.taobao.com/]/////////////////////////////////////
//effect only content in taobao home page
if (location.href.includes("https://world.taobao.com/")) {
    $(window).on('load', function() {
        add_conversion_price($(".price"))
    })

    function add_conversion_price(price_elements) {
        price_elements.each(function(index, each_element) {
            original_price = parseFloat(each_element.textContent.substring(1))
            converted_price = (original_price * currency_rate).toFixed(2)
            each_element.textContent = each_element.textContent + " or " + converted_price + " "+currency_change
        });
    }
}


/////////////////////////////////////[https://s.taobao.com/]/////////////////////////////////////
//effect only in taobao search page
if (location.href.includes("https://s.taobao.com/")) {

    //when the page is loaded
    $(window).on('load', function() {
        //start the custom price tag
        c_price_tag_main($("[data-category='auctions']"))
        c_price_tag_ads_side($("#J_shopkeeper [class$='-line1']"), 1)//element, tag location(U=1/D=0)
        // c_price_tag_ads_side($("#J_shopkeeper_bottom [class$='-line1']"), 0)//element, tag location(U=1/D=0) //checking

    })

    //activate the page change recheck
    click_event_reinitiate()

    //this will handle on page change multiple time, so that the click event still available
    function click_event_reinitiate() {
      $("#mainsrp-pager .inner").on('click', function(e) {
        recheck_on_pagechange()
      })
    }

    function recheck_on_pagechange() {
          //compare the current and previous url for 5 times loop of 1second
          // Returns a Promise that resolves after "ms" Milliseconds
          const timer = ms => new Promise(res => setTimeout(res, ms))

          async function load() { // We need to wrap the loop into an async function for this to work
              for (var i = 0; i < 5; i++) {
                  //check the existent of custom price tag
                  var cpt_checker = $(".this_is_custom_price_tag").length
                  //if no
                  if (cpt_checker == 0) {
                      c_price_tag_main($("[data-category='auctions']"))
                      await timer(500);
                      c_price_tag_ads_side($("#J_shopkeeper [class$='-line1']"), 1)//element, tag location(U=1/D=0)
                      click_event_reinitiate()
                      break
                  } //else just go to other loop
                  await timer(1000); // then the created Promise can be awaited
              }
          }

          load();
    }

    //change price tag for the main page content middle
    function c_price_tag_main(item_boxs) {
        item_boxs.css("height", "420px");
        //in each box
        item_boxs.each(function(index, each_element) {
            var original_price = parseFloat($(this).find(".price>strong").get(0).innerHTML)
            var usd_price = (original_price * currency_rate).toFixed(2)
            //clone the price tag and style
            //adjust margin for new price tag
            //convert to html
            var original_price_html = $(this)
                .find(".price")
                .clone()
                .addClass("this_is_taobao_currency_price_dom")
                //.append(`<span style="margin: 0px;"> or </span><strong>` + usd_price + " "+currency_change+"</strong>")
                .append('<div class="taobao_currency_modified_tag min"><i></i><span>≈ ' + usd_price + ' '+currency_change+'</span></div>')
                .css({
                    "margin-top": "10px",
                    "margin-left": "10px",
                    "font-size": "15px"
                })
                .get(0)
                .outerHTML
            //change the information box margin, prevent the intent of price tag
            $(this).find(".price").remove()
            $(this).find(".ctx-box").css({
                "margin-top": "22px"
            })
            //add the cloned price tag under the picture
            $(this).find(".ctx-box").before(original_price_html + "<br>")
        });
    }

    //change price tag for side bar ads
    function c_price_tag_ads_side(ads_price, tag_location) {
        $("li.oneline").css('height', '340px')
        //select all the price tag j shoper item list
        ads_price.each(function(index, each_ad_price_box) {
            var ad_price_sec = $(this).find("[class$='-price']") //get the price tag
            var ad_original_price = parseFloat(ad_price_sec.get(0).outerText.substring(1)) //get the cny price
            var ad_usd_price = (ad_original_price * currency_rate).toFixed(2) //calculate the usd price
            var new_price_tag_html = ad_price_sec.clone().addClass("this_is_taobao_currency_price_dom")
            //.append(" or " + ad_usd_price + " "+currency_change)
            .append('<div class="taobao_currency_modified_tag min"><i></i><span>≈ ' + ad_usd_price + ' '+currency_change+'</span></div>')
            .css({
                'font-size': '15px',
                'margin-left': '10px',
                'margin-top': '6px',
            }).get(0).outerHTML //working on adding usd price with old price
            ad_price_sec.remove() //remove the old price tag
 
            if (tag_location==1) {
             $(this).before(new_price_tag_html + "<br>") //show the new price after the old price box
             $('.this_is_taobao_currency_price_dom').next().next().css({'margin-top': '20px'});
             $('.this_is_taobao_currency_price_dom').next().next().next().css({'bottom': '105px'});
             $('.this_is_taobao_currency_price_dom').next().next().next().next().css({'bottom': '70px'});
            }else{
             $(this).after(new_price_tag_html) //show the new price after the old price box
             $('.this_is_taobao_currency_price_dom').next().css({'margin-top': '40px'});
             $('.this_is_taobao_currency_price_dom').next().next().css({'bottom': '105px'});
             $('.this_is_taobao_currency_price_dom').next().next().next().css({'bottom': '70px'});
            }
        })
        //check on class name that contant the -price

        //change price tag with usd price and make it smaller

    }

    /**
     * @todo Handle J_shopkeeper_buttom price tag [s.taobao.com]
     * @body The advertisement items price tag on the buttom of main
     */
}


/////////////////////////////////////[https://item.taobao.com/]/////////////////////////////////////
//effect only in taobao item detail page
if (location.href.includes("https://item.taobao.com/")) {
  
    var done_flag = 0;
    //when the page is loaded
    $("#J_StrPrice").ready(function() {
        //start the custom price tag
        start(0)
    })

    //the main function that will handle all the price
    async function start(loaded) {
      if (done_flag){
        return;
      }
      if (loaded){//1 if the component completely load, call from click
        await timer(100);
      }else{//call from begining
        await timer(1000);
      }
      c_price_initem($("#J_StrPrice"))
      if($("strong.tb-promo-price")!=null){
        c_price_initem($("strong.tb-promo-price"))
      }
    }

    function click_event_reinitiate() {
      //detect the lock on item property
      $("ul.J_TSaleProp a").on('click', async function() {
        await timer(100);//am lazy so just delay abit then everything will work normally
        // console.log("Clicked----")
        $(".taobao_currency_modified_tag").remove()
        done_flag = 0;
        start(1)
      })
    }

    //activate the page change recheck
    click_event_reinitiate()

    function c_price_initem(price_tag) {
      try {
        var price_tag_len = price_tag.get(0).outerText.length==0
        if (price_tag_len){//making sure that no bug
          throw "Empty string"
        }
      }
      catch(err) {
        // console.log("ERROR -- Retry")
        // console.log("Retrying")
        start(0)
      }
      //price tag
      if (price_tag.get(0)){
        if (price_tag.get(0).outerText.includes("-")) {//handle the price with -//check if the text with -
          var original_price_arr = price_tag.get(0).outerText.split("-")//split by that -
          var new_price_tag_html = `<div class="taobao_currency_modified_tag"><i></i>` + "<span>≈ " + (parseFloat(original_price_arr[0].substring(1))*currency_rate).toFixed(2) + " - " + (parseFloat(original_price_arr[1])*currency_rate).toFixed(2) + " "+currency_change+""+ "</span></div>"//the first str was include the cny char
          price_tag.find("em:last").after(new_price_tag_html)//append new price after the old price
          done_flag = 1
        }else{
          var original_price = parseFloat(price_tag.get(0).outerText.substring(1))
          var usd_price = (original_price * currency_rate).toFixed(2)//cal for the usd price
          var new_price_tag_html = `<div class="taobao_currency_modified_tag"><i></i>` + "<span>≈ " + usd_price +" " + currency_change+"</span></<div>"//create new price text
          price_tag.find("em:last").after(new_price_tag_html)//append new price after the old price
          done_flag = 1
        }
      }
      /**
       * @todo Custom price tag validation
       * @body Make sure it is not show the duplicate
       */
    }
}

/////////////////////////////////////[https://detail.tmall.com]/////////////////////////////////////
//effect only in taobao item detail tmall page
if (location.href.includes("https://detail.tmall.com/")) {
    //if this component load start the script
    $("#J_StrPriceModBox dd").ready(function(){
      //align the price tag location
      $("#J_StrPriceModBox dd").css({"margin-left": "77px"})
      $("#J_PromoPrice dd").css({"margin-left": "77px"})
      //start the custom price tag
      start(0)
    });

    async function start(loaded) {
      if (loaded){//1 if the component completely load, call from click
        await timer(100);
      }else{//call from begining
        await timer(1000);
      }
      c_price_initem($("#J_StrPriceModBox dd"))
      if($("#J_PromoPrice dd .tm-promo-price").length>0){
        c_price_initem($("#J_PromoPrice dd .tm-promo-price"))
      }
    }

    function click_event_reinitiate() {
      $("ul.J_TSaleProp a").on('click', async function() {
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
        if (price_tag.get(0).outerText.length==0){//making sure that no bug
          throw "Empty string"
        }
      }
      catch(err) {
        // console.log("ERROR -- Retry")
        // console.log("Retrying")
        start(0)
      }
      //price tag
      if (price_tag.get(0).outerText.includes("-")) {//handle the price with -//check if the text with -
        var original_price_arr = price_tag.get(0).outerText.split("-")//split by that -
        var new_price_tag_html = `<div class="tm-price taobao_currency_modified_tag">` + "<i></i><span>≈ " + (parseFloat(original_price_arr[0].substring(1))*currency_rate).toFixed(2) + "-" + (parseFloat(original_price_arr[1])*currency_rate).toFixed(2) + " " +currency_change+ "</span></div>"//the first str was include the cny char
        price_tag.find("span:last").after(new_price_tag_html)//append new price after the old price
      }else{
        var original_price = parseFloat(price_tag.get(0).outerText.substring(1))
        var usd_price = (original_price * currency_rate).toFixed(2)//cal for the usd price
        var new_price_tag_html = `<div class="tm-price taobao_currency_modified_tag">` + "<i></i><span>" + usd_price +" " +currency_change+ "</span></div>"//create new price text
        price_tag.find("span:last").after(new_price_tag_html)//append new price after the old price
      }
      /**
       * @todo Custom price tag validation
       * @body Make sure it is not show the duplicate
       */
    }
}