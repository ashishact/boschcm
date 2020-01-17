let temperature_series = {};
let init_graph = function () {
    am4core.ready(function () {

        // Themes begin
        am4core.useTheme(am4themes_animated);
        // Themes end

        var chart = am4core.create("graphdiv", am4charts.XYChart);
        // chart.data = [];
        // chart.dateFormatter.dateFormat = "yyyy-MM-dd";



        // Create axes
        var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.minGridDistance = 60;

        dateAxis.dateFormatter = new am4core.DateFormatter();
        dateAxis.dateFormatter.dateFormat = "yyyy-MM-dd";



        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());

        // Create series
        var series = chart.series.push(new am4charts.LineSeries());
        temperature_series = series;

        series.dataFields.valueY = "temperature";
        series.dataFields.dateX = "date";
        series.tooltipText = "{temperature} ℃";
        series.strokeWidth = 2;
        // series.tensionX = 0.6; // smooth



        series.tooltip.pointerOrientation = "vertical";
        // series.tooltipHTML = get_block_html();


        // Make bullets grow on hover
        var bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 4;
        bullet.circle.fill = am4core.color("#fff");

        var bullethover = bullet.states.create("hover");
        bullethover.properties.scale = 1.3;



        bullet.events.on("hit", function(event) {
            
            document.getElementById("blockdiv").innerHTML = get_block_html(event.target.dataItem.dataContext);

            
            navigator.clipboard.writeText(JSON.stringify(event.target.dataItem.dataContext.tx, null, 4)).then(function() {
                console.log('Async: Copying to clipboard was successful!');
              }, function(err) {
                console.error('Async: Could not copy text: ', err);
              });
        })

        

        // Make a panning cursor
        chart.cursor = new am4charts.XYCursor();
        // chart.cursor.behavior = "panXY";
        chart.cursor.xAxis = dateAxis;
        chart.cursor.snapToSeries = series;






        // chart.cursor = new am4charts.XYCursor();
        // chart.cursor.snapToSeries = series;
        // chart.cursor.xAxis = dateAxis;


        // //Create vertical scrollbar and place it before the value axis
        // chart.scrollbarY = new am4core.Scrollbar();
        // chart.scrollbarY.parent = chart.leftAxesContainer;
        // chart.scrollbarY.toBack();

        // //Create a horizontal scrollbar with previe and place it underneath the date axis
        // chart.scrollbarX = new am4charts.XYChartScrollbar();
        // chart.scrollbarX.series.push(series);
        // chart.scrollbarX.parent = chart.bottomAxesContainer;

        // dateAxis.start = 0.79;
        // dateAxis.keepSelection = true;




        // chart.scrollbarY = new am4core.Scrollbar();
        // chart.scrollbarX = new am4core.Scrollbar();

    }); // end am4core.ready()
}

let graph_sort_temperature_series = function () {
    temperature_series.data.sort(function (a, b) {
        var atime = a.date.getTime();
        var btime = b.date.getTime();

        if (atime < btime) {
            return -1;
        }
        else if (atime == btime) {
            return 0;
        }
        else {
            return 1;
        }
    })
}




window.onload = function () {
    console.log("STARING APP");
    
    let my_addres = "0x71b13b12De5bC4aE8e0b3457f9812746043785e4";
    let cm5_address = "0x1Af3be43Db006E02315d0b9124c0a1406C1Bff54";
    let topic0 = "0x1cd680694a41c497811a1c96167cc9b6a0e451677d1837307967fa441ceff5cc";


    let address = my_addres;
    let _q = window.location.search;
    if(_q.search("address=" > 0)){
        let m = _q.match(/.+?address=(0x[0-9a-fA-F]+)/);
        if(m) address = m[1];
    }


    // let web3 = new Web3(Web3.givenProvider || 'wss://ropsten.infura.io/ws');
    // if(Web3.givenProvider.networkVersion)
    // web3.eth.net.getNetworkType().then(console.log);

    let web3 = new Web3('wss://ropsten.infura.io/ws');




    let tx_api = `https://api-ropsten.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc`;


    this.document.getElementById("deviceid").innerText = address;


    let got_tx = function (tx, do_not_update_graph) {
        if (tx.input && tx.input.length == 2 + 4 * 2 + 64 * 2) {
            let i = tx.input;
            let func = i.substring(0, 10);
            let hash = '0x' + i.substring(10, 10 + 64);
            let temp = parseInt(i.substring(10 + 64, 10 + 64 + 64), 16) / 100;
            console.log("func: %s\r\nhash: 0x%s\r\ntemperature: %f", func, hash, temp, tx);
            let date = new Date(); if (tx.timeStamp) date = new Date(parseInt(tx.timeStamp) * 1000);

            // remove the null data at last
            if (temperature_series.data.length && !(temperature_series.data[temperature_series.data.length - 1].temperature)) temperature_series.data.pop();


            temperature_series.data.push({ date: date, temperature: temp, hash: hash, input: i, nonce: tx.nonce, datestr: date.toString(), blockhash: tx.blockHash, tx: tx});
            if (!do_not_update_graph) temperature_series.invalidateData();
        }
    }


    subscription = web3.eth.subscribe('logs', {
        address: cm5_address,
        // topics: [topic0]
    }, function (error, result) {
        if (!error) {
            // console.log(result);
            web3.eth.getTransaction(result.transactionHash).then(data => {
                console.log(data);
                got_tx(data);

                // update block ui
                document.getElementById("blockdiv").innerHTML = get_block_html(temperature_series.data[temperature_series.data.length-1]);
                
            }).catch(err => {
                console.warn(err);
            });
        }
    })
        .on("data", function (log) {
            // console.log(log); // same as result
        })
        .on("changed", function (log) {
        });


    // Draw graph
    init_graph();



    fetch(tx_api)
        .then((response) => {
            return response.json();
        })
        .then((json) => {
            if (json.result && json.result.length) {
                let txs = json.result.reverse(); // @note .reverse() mutates the array
                for (let tx of txs) {
                    got_tx(tx, true);
                }
                graph_sort_temperature_series();

                // update block ui
                document.getElementById("blockdiv").innerHTML = get_block_html(temperature_series.data[temperature_series.data.length-1]);



                // add current time with null
                temperature_series.data.push({ date: new this.Date(), temperature: null });
                temperature_series.invalidateData();

            }
            else {
                console.log(json);
            }
        }).catch((err) => {
            console.warn("fetch error: ", err);
        })


    // setInterval(function(){graph_add_temperature(20*Math.random());}, 1000);


}



let get_block_html = function (o) {
    return `<div style="box-sizing: border-box; font-family: DINPro, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Oxygen, Ubuntu, Cantarell, &quot;Fira Sans&quot;, &quot;Droid Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif; line-height: 1.5; margin: auto; padding: 10px 8px 0px; list-style: none; background: rgb(255, 255, 255); border-radius: 10px; position: relative; transition: all 0.3s ease 0s; border: none; max-width: fit-content; display: flex; flex-flow: column nowrap; box-shadow: rgba(10, 16, 34, 0.2) 0px 1px 1px 0px !important;"><div  style="box-sizing: border-box; padding: 24px; zoom: 1;"><div style="box-sizing: border-box;"><span  style="box-sizing: border-box; display: inline-block; vertical-align: top; width: 530.969px; margin-bottom: 20px;"><span  style="box-sizing: border-box; font-family: &quot;Helvetica Neue For Number&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;PingFang SC&quot;, &quot;Hiragino Sans GB&quot;, &quot;Microsoft YaHei&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; margin: 0px; padding: 0px; list-style: none; position: relative; display: table; border-collapse: separate; border-spacing: 0px; width: 530px;"><span  style="box-sizing: border-box; display: table-cell; width: 1px; white-space: nowrap; vertical-align: middle; padding: 4px 11px; line-height: 1; text-align: center; background-color: rgb(250, 250, 250); border-width: 1px 0px 1px 1px; border-top-style: solid; border-right-style: initial; border-bottom-style: solid; border-left-style: solid; border-top-color: rgb(217, 217, 217); border-right-color: initial; border-bottom-color: rgb(217, 217, 217); border-left-color: rgb(217, 217, 217); border-image: initial; border-radius: 4px 0px 0px 4px; position: relative; transition: all 0.3s ease 0s;"><span style="box-sizing: border-box; margin-right: 7px; margin-left: 7px;">INPUT</span></span><span style="box-sizing: border-box; font-family: &quot;Helvetica Neue For Number&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;PingFang SC&quot;, &quot;Hiragino Sans GB&quot;, &quot;Microsoft YaHei&quot;, &quot;Helvetica Neue&quot;, Helvetica, Arial, sans-serif; line-height: 1.5; margin: 0px; padding: 0px; list-style: none; position: relative; display: table-cell; width: 459px; float: left;"><span style="box-sizing: border-box; position: absolute; top: 16px; transform: translateY(-50%); z-index: 2; line-height: 0; left: 12px;"><span  style="box-sizing: border-box; display: inline-block; vertical-align: baseline; text-align: center; line-height: 1; text-rendering: optimizelegibility; -webkit-font-smoothing: antialiased;"></span></span><span type="text"  style="box-sizing: border-box; margin: 0px; font-family: DINPro, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Oxygen, Ubuntu, Cantarell, &quot;Fira Sans&quot;, &quot;Droid Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif; font-size: 10px; line-height: 1.5; color: rgba(0, 0, 0, 0.65); overflow: visible; list-style: none; position: relative; padding: 4px 11px 4px 30px; width: 459px; height: 64px; background-color: rgb(255, 255, 255); background-image: none; border-width: 1px; border-style: solid; border-color: rgb(217, 217, 217); border-radius: 0px 4px 4px 0px; transition: all 0.3s ease 0s; -webkit-appearance: none; touch-action: manipulation; float: left; z-index: 1; min-height: 100%; overflow-wrap: break-word;">${o.input}</span></span></span></span><div  style="box-sizing: border-box; margin-bottom: 7px; display: flex; justify-content: flex-start; flex-wrap: nowrap; max-width: 100%; overflow: auto;"><div style="box-sizing: border-box; white-space: nowrap; font-size: 12px">BLOCK HASH</div><div data-show="true" style="box-sizing: border-box; font-family: &quot;Courier New&quot;; color: rgb(82, 196, 26); margin: 0px 8px 0px 0px; list-style: none; line-height: 20px; height: 22px; padding: 0px 7px; border-radius: 4px; border: 1px solid transparent; background: none; font-size: 8pt; transition: all 0.3s cubic-bezier(0.215, 0.61, 0.355, 1) 0s; opacity: 1; cursor: default; float: right;"><span style="box-sizing: border-box;">${o.blockhash}</span></div></div><div style="box-sizing: border-box; display: flex; justify-content: flex-start; flex-wrap: nowrap; max-width: 100%; overflow: auto;"><div style="box-sizing: border-box; margin-right: 15px;">DATA HASH</div><div data-show="true" style="box-sizing: border-box; font-family: &quot;Courier New&quot;; color: rgb(82, 196, 26); margin: 0px 8px 0px 0px; list-style: none; line-height: 20px; height: 22px; padding: 0px 7px; border-radius: 4px; border: 1px solid rgb(183, 235, 143); background: rgb(246, 255, 237); font-size: 9pt; transition: all 0.3s cubic-bezier(0.215, 0.61, 0.355, 1) 0s; opacity: 1; cursor: default; max-width: 100%; overflow: auto;"><span style="box-sizing: border-box;">${o.hash}</span></div></div><div style="box-sizing: border-box; margin-top: 27px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; text-overflow: ellipsis;"><div style="box-sizing: border-box; font-size: 24px; white-space: nowrap; overflow: auto;"><span  style="box-sizing: border-box; letter-spacing: 1px;">${o.temperature} ℃</span>&nbsp;<span  style="box-sizing: border-box;"><span style="box-sizing: border-box; font-size: 8pt; ">on ${o.datestr}</span></span></div><div data-show="true" style="box-sizing: border-box; font-family: DINPro, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Oxygen, Ubuntu, Cantarell, &quot;Fira Sans&quot;, &quot;Droid Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif; margin: 0px 8px 0px 0px; list-style: none; display: inline-block; line-height: 20px; height: 22px; padding: 0px 7px; border-radius: 4px; border: 1px solid rgb(217, 217, 217); background: rgb(250, 250, 250); transition: all 0.3s cubic-bezier(0.215, 0.61, 0.355, 1) 0s; opacity: 1; cursor: default;"><span class="ant-tag-text" style="box-sizing: border-box;">${o.nonce}</span></div></div></div></div></div>`
}