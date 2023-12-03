function scaffold() {
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

// Example usage inside an async function
async function example() {
    await scaffold().latest({
        base_currency: 'CNY',
        currencies: 'MYR'
    }).then(({ data: data }) => {
        console.log(data)
    })
}

// Call the example function
example();
//document.querySelector('.result').innerHTML = JSON.stringify(data, null, 2);
//currency_rate = data.rates[currency_change];
//document.body.prepend(warningHeader);