class Analytics {
  
  constructor() {
    this.data = {};
  }
  
  evar(num, value) {
    this.data["v"+num] = value;
  }
  
  prop(num, value) {
    this.data["c"+num] = value;
  }
  
  event(num) {
    if (this.data.events) {
      this.data.events = this.data.events+",event"+num;
    } else {
      this.data.events = "event"+num;
    }
  }
  
  contextData(key, value) {
    this.data["c."+key] = value;
  }
  
  visitorId(vid) {
    this.data["vid"] = vid;
  }
  
  pageName(name) {
    this.data["pageName"] = name;
  }
  
  send(request, rsid) {
    request.get({
      url: 'https://'+rsid+'.sc.omtrdc.net/b/ss/'+rsid+'/0',
      headers: {'User-Agent': 'w3m/0.5.1'},
      qs: this.data,
      function (error, response, body) {
        console.log(body);
      }
    });
  }
}

module.exports = Analytics;