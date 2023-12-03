var currency_choose;
var currency_data = [];

window.onload = () => {
    currency_choose = document.getElementById("currency-choose");
    currency_choose.addEventListener("change", setCurrencyChange);

    var url = "resources/currency_data.json"
    var request = new XMLHttpRequest();
    request.open("get", url);/*设置请求方法与路径*/
    request.send(null);/*不发送数据到服务器*/
    request.onload = function () {/*XHR对象获取到返回信息后执行*/
        if (request.status == 200) {/*返回状态为200，即为数据获取成功*/
            var json = JSON.parse(request.responseText);
            currency_data = json;
            initCurrencyChange();
        }
    }

    /*var requestURL = 'https://api.exchangerate.host/latest?base=CNY&symbols=USD';
var request = new XMLHttpRequest();
request.open('GET', requestURL);
request.responseType = 'json';
request.send();

request.onload = function() {
  var response = request.response;
  console.log(response);
}*/
   
};

function setCurrencyChange(){
    var currency = currency_choose.value;
    chrome.storage.sync.set({
        taobao_currency: currency
    }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "taobao_currency_choose" }, function (response) {
                    console.log('send')
                    console.log(response)
                });  
            }); 
        initCurrencyChange();
    })
} 

function initCurrencyChange(){
    var select_html = "";
    for (let i in currency_data) { 
        //console.log(i, currency_data[i]);
        select_html += '<option value="'+currency_data[i].value+'">('+currency_data[i].value+') '+currency_data[i].name+'</option>';
    }  
    currency_choose.innerHTML = select_html;
    chrome.storage.sync.get({
        taobao_currency: 'USD'
      }, (data) => {
          console.log(data.taobao_currency);
        for (var i = 0; i < currency_choose.options.length; i++) {
            if (currency_choose.options[i].value == data.taobao_currency) {
                currency_choose.options[i].selected = true;
                break;
            }
        }
    });
}