define(['jquery', 'underscore', 'backbone','d3gauge','layoutmanager'], function($, _, Backbone, Gauge){
  var Graphene,
      bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
      hasProp = {}.hasOwnProperty;

  Graphene = (function() {
    function Graphene() {
      this.build = bind(this.build, this);
      this.models = {};
    }

    Graphene.prototype.demo = function() {
      return this.is_demo = true;
    };

    Graphene.prototype.build = function(json) {
      return _.each(_.keys(json), (function(_this) {
        return function(k) {
          var klass, model_opts, ts;
          console.log("building [" + k + "]");
          if (_this.is_demo) {
            klass = Graphene.DemoTimeSeries;
          } else {
            klass = Graphene.TimeSeries;
          }
          model_opts = {
            source: json[k].source
          };
          delete json[k].source;
          if (json[k].refresh_interval) {
            model_opts.refresh_interval = json[k].refresh_interval;
            delete json[k].refresh_interval;
          }
          ts = new klass(model_opts);
          _this.models[k] = ts;
          return _.each(json[k], function(opts, view) {
            klass = eval("Graphene." + view + "View");
            console.log(_.extend({
              model: ts,
              ymin: _this.getUrlParam(model_opts.source, "yMin"),
              ymax: _this.getUrlParam(model_opts.source, "yMax")
            }, opts));
            new klass(_.extend({
              model: ts,
              ymin: _this.getUrlParam(model_opts.source, "yMin"),
              ymax: _this.getUrlParam(model_opts.source, "yMax")
            }, opts));
            return ts.start();
          });
        };
      })(this));
    };

    Graphene.prototype.discover = function(url, dash, parent_specifier, cb) {
      return $.getJSON(url + "/dashboard/load/" + dash, function(data) {
        var desc, i;
        i = 0;
        desc = {};
        _.each(data['state']['graphs'], function(graph) {
          var conf, path, title;
          path = graph[2];
          conf = graph[1];
          title = conf.title ? conf.title : "n/a";
          desc["Graph " + i] = {
            source: "" + url + path + "&format=json",
            TimeSeries: {
              title: title,
              ymin: conf.yMin,
              parent: parent_specifier(i, url)
            }
          };
          return i++;
        });
        return cb(desc);
      });
    };

    Graphene.prototype.getUrlParam = function(url, variable) {
      var query, value, vars;
      value = '';
      query = url.split('?')[1];
      if (!query) {
        return value;
      }
      vars = query.split('&');
      if (!(vars && vars.length > 0)) {
        return value;
      }
      _.each(vars, function(v) {
        var pair;
        pair = v.split('=');
        if (decodeURIComponent(pair[0]) === variable) {
          return value = decodeURIComponent(pair[1]);
        }
      });
      return value;
    };

    return Graphene;

  })();

  this.Graphene = Graphene;

  Graphene.GraphiteModel = (function(superClass) {
    extend(GraphiteModel, superClass);

    function GraphiteModel() {
      this.process_data = bind(this.process_data, this);
      this.refresh = bind(this.refresh, this);
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      return GraphiteModel.__super__.constructor.apply(this, arguments);
    }

    GraphiteModel.prototype.defaults = {
      source: '',
      data: null,
      ymin: 0,
      ymax: 0,
      refresh_interval: 10000
    };

    GraphiteModel.prototype.debug = function() {
      return console.log("" + (this.get('refresh_interval')));
    };

    GraphiteModel.prototype.start = function() {
      this.refresh();
      console.log("Starting to poll at " + (this.get('refresh_interval')));
      return this.t_index = setInterval(this.refresh, this.get('refresh_interval'));
    };

    GraphiteModel.prototype.stop = function() {
      return clearInterval(this.t_index);
    };

    GraphiteModel.prototype.refresh = function() {
      var options, url;
      url = this.get('source');
      if (-1 === url.indexOf('&jsonp=?')) {
        url = url + '&jsonp=?';
      }
      options = {
        url: url,
        dataType: 'json',
        jsonp: 'jsonp',
        success: (function(_this) {
          return function(js) {
            console.log("got data.");
            return _this.process_data(js);
          };
        })(this)
      };
      return $.ajax(options);
    };

    GraphiteModel.prototype.process_data = function() {
      return null;
    };

    return GraphiteModel;

  })(Backbone.Model);

  Graphene.DemoTimeSeries = (function(superClass) {
    extend(DemoTimeSeries, superClass);

    function DemoTimeSeries() {
      this.add_points = bind(this.add_points, this);
      this.refresh = bind(this.refresh, this);
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      return DemoTimeSeries.__super__.constructor.apply(this, arguments);
    }

    DemoTimeSeries.prototype.defaults = {
      range: [0, 1000],
      num_points: 100,
      num_new_points: 1,
      num_series: 2,
      refresh_interval: 3000
    };

    DemoTimeSeries.prototype.debug = function() {
      return console.log("" + (this.get('refresh_interval')));
    };

    DemoTimeSeries.prototype.start = function() {
      console.log("Starting to poll at " + (this.get('refresh_interval')));
      this.data = [];
      _.each(_.range(this.get('num_series')), (function(_this) {
        return function(i) {
          return _this.data.push({
            label: "Series " + i,
            ymin: 0,
            ymax: 0,
            points: []
          });
        };
      })(this));
      this.point_interval = this.get('refresh_interval') / this.get('num_new_points');
      _.each(this.data, (function(_this) {
        return function(d) {
          return _this.add_points(new Date(), _this.get('range'), _this.get('num_points'), _this.point_interval, d);
        };
      })(this));
      this.set({
        data: this.data
      });
      return this.t_index = setInterval(this.refresh, this.get('refresh_interval'));
    };

    DemoTimeSeries.prototype.stop = function() {
      return clearInterval(this.t_index);
    };

    DemoTimeSeries.prototype.refresh = function() {
      var last, num_new_points, start_date;
      this.data = _.map(this.data, function(d) {
        d = _.clone(d);
        d.points = _.map(d.points, function(p) {
          return [p[0], p[1]];
        });
        return d;
      });
      last = this.data[0].points.pop();
      this.data[0].points.push(last);
      start_date = last[1];
      num_new_points = this.get('num_new_points');
      _.each(this.data, (function(_this) {
        return function(d) {
          return _this.add_points(start_date, _this.get('range'), num_new_points, _this.point_interval, d);
        };
      })(this));
      return this.set({
        data: this.data
      });
    };

    DemoTimeSeries.prototype.add_points = function(start_date, range, num_new_points, point_interval, d) {
      _.each(_.range(num_new_points), (function(_this) {
        return function(i) {
          var new_point;
          new_point = [range[0] + Math.random() * (range[1] - range[0]), new Date(start_date.getTime() + (i + 1) * point_interval)];
          d.points.push(new_point);
          if (d.points.length > _this.get('num_points')) {
            return d.points.shift();
          }
        };
      })(this));
      d.ymin = d3.min(d.points, function(d) {
        return d[0];
      });
      return d.ymax = d3.max(d.points, function(d) {
        return d[0];
      });
    };

    return DemoTimeSeries;

  })(Backbone.Model);

  Graphene.BarChart = (function(superClass) {
    extend(BarChart, superClass);

    function BarChart() {
      this.process_data = bind(this.process_data, this);
      return BarChart.__super__.constructor.apply(this, arguments);
    }

    BarChart.prototype.process_data = function(js) {
      var data;
      console.log('process data barchart');
      data = _.map(js, function(dp) {
        var max, min;
        min = d3.min(dp.datapoints, function(d) {
          return d[0];
        });
        if (min === void 0) {
          return null;
        }
        max = d3.max(dp.datapoints, function(d) {
          return d[0];
        });
        if (max === void 0) {
          return null;
        }
        _.each(dp.datapoints, function(d) {
          return d[1] = new Date(d[1] * 1000);
        });
        return {
          points: _.reject(dp.datapoints, function(d) {
            return d[0] === null;
          }),
          ymin: min,
          ymax: max,
          label: dp.target
        };
      });
      data = _.reject(data, function(d) {
        return d === null;
      });
      return this.set({
        data: data
      });
    };

    return BarChart;

  })(Graphene.GraphiteModel);

  Graphene.TimeSeries = (function(superClass) {
    extend(TimeSeries, superClass);

    function TimeSeries() {
      this.process_data = bind(this.process_data, this);
      return TimeSeries.__super__.constructor.apply(this, arguments);
    }

    TimeSeries.prototype.process_data = function(js) {
      var data;
      data = _.map(js, function(dp) {
        var last, max, min, ref;
        min = d3.min(dp.datapoints, function(d) {
          return d[0];
        });
        if (min === void 0) {
          return null;
        }
        max = d3.max(dp.datapoints, function(d) {
          return d[0];
        });
        if (max === void 0) {
          return null;
        }
        last = (ref = _.last(dp.datapoints)[0]) != null ? ref : 0;
        if (last === void 0) {
          return null;
        }
        _.each(dp.datapoints, function(d) {
          return d[1] = new Date(d[1] * 1000);
        });
        return {
          points: _.reject(dp.datapoints, function(d) {
            return d[0] === null;
          }),
          ymin: min,
          ymax: max,
          last: last,
          label: dp.target
        };
      });
      data = _.reject(data, function(d) {
        return d === null;
      });
      return this.set({
        data: data
      });
    };

    return TimeSeries;

  })(Graphene.GraphiteModel);

  Graphene.GaugeGadgetView = (function(superClass) {
    extend(GaugeGadgetView, superClass);

    function GaugeGadgetView() {
      this.render = bind(this.render, this);
      this.by_type = bind(this.by_type, this);
      return GaugeGadgetView.__super__.constructor.apply(this, arguments);
    }

    GaugeGadgetView.prototype.className = 'gauge-gadget-view';

    GaugeGadgetView.prototype.tagName = 'div';

    GaugeGadgetView.prototype.initialize = function() {
      var config;
      this.title = this.options.title;
      this.type = this.options.type;
      this.parent = this.options.parent || '#parent';
      this.value_format = this.options.value_format || ".3s";
      this.null_value = 0;
      this.from = this.options.from || 0;
      this.to = this.options.to || 100;
      this.observer = this.options.observer;
      this.vis = d3.select(this.parent).append("div").attr("class", "ggview").attr("id", this.title + "GaugeContainer");
      config = {
        size: this.options.size || 120,
        label: this.title,
        minorTicks: 5,
        min: this.from,
        max: this.to
      };
      config.redZones = [];
      config.redZones.push({
        from: this.options.red_from || 0.9 * this.to,
        to: this.options.red_to || this.to
      });
      config.yellowZones = [];
      config.yellowZones.push({
        from: this.options.yellow_from || 0.75 * this.to,
        to: this.options.yellow_to || 0.9 * this.to
      });
      this.gauge = new Gauge(this.title + "GaugeContainer", config);
      this.gauge.render();
      //this.model.bind('change', this.render);
      this.listenTo(this.model, 'change', this.afterRender);
      return console.log("GG view ");
    };

    GaugeGadgetView.prototype.by_type = function(d) {
      switch (this.type) {
        case "min":
          return d.ymin;
        case "max":
          return d.ymax;
        case "current":
          return d.last;
        default:
          return d.points[0][0];
      }
    };

    GaugeGadgetView.prototype.afterRender = function() {
      var data, datum;
      console.log("rendering.");
      data = this.model.get('data');
      datum = data && data.length > 0 ? data[0] : {
        ymax: this.null_value,
        ymin: this.null_value,
        points: [[this.null_value, 0]]
      };
      if (this.observer) {
        this.observer(this.by_type(datum));
      }
      return this.gauge.redraw(this.by_type(datum), this.value_format);
    };

    return GaugeGadgetView;

  })(Backbone.Layout);


    Graphene.GaugeLabelView = (function(superClass) {
    extend(GaugeLabelView, superClass);

    function GaugeLabelView() {
      this.render = bind(this.render, this);
      this.by_type = bind(this.by_type, this);
      return GaugeLabelView.__super__.constructor.apply(this, arguments);
    }

    GaugeLabelView.prototype.className = 'gauge-label-view';

    GaugeLabelView.prototype.tagName = 'div';

    GaugeLabelView.prototype.initialize = function() {
      this.unit = this.options.unit;
      this.title = this.options.title;
      this.type = this.options.type;
      this.parent = this.options.parent || '#parent';
      this.value_format = this.options.value_format || ".3s";
      this.value_format = d3.format(this.value_format);
      this.null_value = 0;
      this.observer = this.options.observer;
      this.vis = d3.select(this.parent).append("div").attr("class", "glview");
      if (this.title) {
        this.vis.append("div").attr("class", "label").text(this.title);
      }
      //this.model.bind('change', this.render);
      this.listenTo(this.model, 'change', this.afterRender);
      return console.log("GL view ");
    };

    GaugeLabelView.prototype.by_type = function(d) {
      switch (this.type) {
        case "min":
          return d.ymin;
        case "max":
          return d.ymax;
        case "current":
          return d.last;
        default:
          return d.points[0][0];
      }
    };

    GaugeLabelView.prototype.afterRender = function() {
      var data, datum, metric, metric_items, vis;
      data = this.model.get('data');
      console.log(data);
      datum = data && data.length > 0 ? data[0] : {
        ymax: this.null_value,
        ymin: this.null_value,
        points: [[this.null_value, 0]]
      };
      if (this.observer) {
        this.observer(this.by_type(datum));
      }
      vis = this.vis;
      metric_items = vis.selectAll('div.metric').data([datum], (function(_this) {
        return function(d) {
          return _this.by_type(d);
        };
      })(this));
      metric_items.exit().remove();
      metric = metric_items.enter().insert('div', ":first-child").attr('class', "metric" + (this.type ? ' ' + this.type : ''));
      metric.append('span').attr('class', 'value').text((function(_this) {
        return function(d) {
          return _this.value_format(_this.by_type(d));
        };
      })(this));
      if (this.unit) {
        return metric.append('span').attr('class', 'unit').text(this.unit);
      }
    };

    return GaugeLabelView;

  })(Backbone.Layout);


  //antoher way to implement Graphene.GaugeLabelView
  // Graphene.GaugeLabelView = Backbone.Layout.extend({
  //      className: function(){ return 'gauge-label-view';},
  //      tagName: function(){return 'div'},
  //      initialize: function(){this.unit = this.options.unit;
  //        this.title = this.options.title;
  //        this.type = this.options.type;
  //        this.parent = this.options.parent || '#parent';
  //        this.value_format = this.options.value_format || ".3s";
  //        this.value_format = d3.format(this.value_format);
  //        this.null_value = 0;
  //        this.observer = this.options.observer;
  //        this.vis = d3.select(this.parent).append("div").attr("class", "glview");
  //        if (this.title) {
  //          this.vis.append("div").attr("class", "label").text(this.title);
  //        }
  //        //this.model.bind('change', this.afterRender);
  //        this.listenTo(this.model, 'change', this.afterRender);
  //        return console.log("GL view ");},
  //      by_type: function(d) {
  //        switch (this.type) {
  //          case "min":
  //            return d.ymin;
  //          case "max":
  //            return d.ymax;
  //          case "current":
  //            return d.last;
  //          default:
  //            return d.points[0][0];
  //        }
  //      },
  //      afterRender: function(){
  //        var data, datum, metric, metric_items, vis;
  //        data = this.model.get('data');
  //        console.log(data);
  //        datum = data && data.length > 0 ? data[0] : {
  //          ymax: this.null_value,
  //          ymin: this.null_value,
  //          points: [[this.null_value, 0]]
  //        };
  //        if (this.observer) {
  //          this.observer(this.by_type(datum));
  //        }
  //        vis = this.vis;
  //        metric_items = vis.selectAll('div.metric').data([datum], (function(_this) {
  //          return function(d) {
  //            return _this.by_type(d);
  //          };
  //        })(this));
  //        metric_items.exit().remove();
  //        metric = metric_items.enter().insert('div', ":first-child").attr('class', "metric" + (this.type ? ' ' + this.type : ''));
  //        metric.append('span').attr('class', 'value').text((function(_this) {
  //          return function(d) {
  //            return _this.value_format(_this.by_type(d));
  //          };
  //        })(this));
  //        if (this.unit) {
  //          return metric.append('span').attr('class', 'unit').text(this.unit);
  //        }
  //      }
  //    })

  Graphene.TimeSeriesView = (function(superClass) {
    extend(TimeSeriesView, superClass);

    function TimeSeriesView() {
      this.render = bind(this.render, this);
      return TimeSeriesView.__super__.constructor.apply(this, arguments);
    }

    TimeSeriesView.prototype.tagName = 'div';

    TimeSeriesView.prototype.initialize = function() {
      this.name = this.options.name || "g-" + parseInt(Math.random() * 1000000);
      this.line_height = this.options.line_height || 16;
      this.x_ticks = this.options.x_ticks || 4;
      this.y_ticks = this.options.y_ticks || 4;
      this.animate_ms = this.options.animate_ms || 500;
      this.label_offset = this.options.label_offset || 0;
      this.label_columns = this.options.label_columns || 1;
      this.label_href = this.options.label_href || function(label) {
            return '#';
          };
      this.label_formatter = this.options.label_formatter || function(label) {
            return label;
          };
      this.num_labels = this.options.num_labels || 3;
      this.sort_labels = this.options.labels_sort;
      this.display_verticals = this.options.display_verticals || false;
      this.width = this.options.width || 400;
      this.height = this.options.height || 100;
      this.padding = this.options.padding || [this.line_height * 2, 32, this.line_height * (3 + (this.num_labels / this.label_columns)), 32];
      this.title = this.options.title;
      this.firstrun = true;
      this.parent = this.options.parent || '#parent';
      this.null_value = 0;
      this.show_current = this.options.show_current || false;
      this.observer = this.options.observer;
      this.postrender = this.options.post_render || postRenderTimeSeriesView;
      this.vis = d3.select(this.parent).append("svg").attr("class", "tsview").attr("width", this.width + (this.padding[1] + this.padding[3])).attr("height", this.height + (this.padding[0] + this.padding[2])).append("g").attr("transform", "translate(" + this.padding[3] + "," + this.padding[0] + ")");
      this.value_format = this.options.value_format || ".3s";
      this.value_format = d3.format(this.value_format);
      //this.model.bind('change', this.render);
      this.listenTo(this.model, 'change', this.afterRender);
      return console.log("TS view: " + this.name + " " + this.width + "x" + this.height + " padding:" + this.padding + " animate: " + this.animate_ms + " labels: " + this.num_labels);
    };

    TimeSeriesView.prototype.afterRender = function() {
      var area, d, data, dmax, dmin, errorData, leg_items, line, litem_enters, litem_enters_a, litem_enters_text, order, points, ref, title, vis, warnData, x, xAxis, xmax, xmin, xpoints, xtick_sz, y, yAxis;
      console.log("rendering.");
      data = this.model.get('data');
      data = data && data.length > 0 ? data : [
        {
          ymax: this.null_value,
          ymin: this.null_value,
          points: [[this.null_value, 0], [this.null_value, 0]]
        }
      ];
      dmax = _.max(data, function(d) {
        return d.ymax;
      });
      dmax.ymax_graph = this.options.ymax || dmax.ymax;
      dmin = _.min(data, function(d) {
        return d.ymin;
      });
      dmin.ymin_graph = (ref = this.options.ymin) != null ? ref : dmin.ymin;
      xpoints = _.flatten((function() {
        var l, len, results;
        results = [];
        for (l = 0, len = data.length; l < len; l++) {
          d = data[l];
          results.push(d.points.map(function(p) {
            return p[1];
          }));
        }
        return results;
      })());
      xmin = _.min(xpoints, function(x) {
        return x.valueOf();
      });
      xmax = _.max(xpoints, function(x) {
        return x.valueOf();
      });
      x = d3.time.scale().domain([xmin, xmax]).range([0, this.width]);
      y = d3.scale.linear().domain([dmin.ymin_graph, dmax.ymax_graph]).range([this.height, 0]).nice();
      xtick_sz = this.display_verticals ? -this.height : 0;
      xAxis = d3.svg.axis().scale(x).ticks(this.x_ticks).tickSize(xtick_sz).tickSubdivide(true);
      yAxis = d3.svg.axis().scale(y).ticks(this.y_ticks).tickSize(-this.width).orient("left").tickFormat(d3.format("s"));
      vis = this.vis;
      line = d3.svg.line().x(function(d) {
        return x(d[1]);
      }).y(function(d) {
        return y(d[0]);
      });
      area = d3.svg.area().x(function(d) {
        return x(d[1]);
      }).y0(this.height - 1).y1(function(d) {
        return y(d[0]);
      });
      if (this.sort_labels) {
        order = this.sort_labels === 'desc' ? -1 : 1;
        data = _.sortBy(data, function(d) {
          return order * d.ymax;
        });
      }
      if (this.observer) {
        this.observer(data);
      }
      points = _.map(data, function(d) {
        return d.points;
      });
      if (this.firstrun) {
        this.firstrun = false;
        vis.append("svg:g").attr("class", "x axis").attr("transform", "translate(0," + this.height + ")").transition().duration(this.animate_ms).call(xAxis);
        vis.append("svg:g").attr("class", "y axis").call(yAxis);
        vis.selectAll("path.line").data(points).enter().append('path').attr("d", line).attr('class', function(d, i) {
          return 'line ' + ("h-col-" + (i + 1));
        });
        vis.selectAll("path.area").data(points).enter().append('path').attr("d", area).attr('class', function(d, i) {
          return 'area ' + ("h-col-" + (i + 1));
        });
        if (this.options.warn && (dmax.ymax_graph > this.options.warn)) {
          warnData = [[[this.options.warn, xmin], [this.options.warn, xmax]]];
          vis.selectAll("path.line-warn").data(warnData).enter().append('path').attr('d', line).attr('stroke-dasharray', '10,10').attr('class', 'line-warn');
        }
        if (this.options.error && (dmax.ymax_graph > this.options.error)) {
          errorData = [[[this.options.error, xmin], [this.options.error, xmax]]];
          vis.selectAll("path.line-error").data(errorData).enter().append('path').attr('d', line).attr('stroke-dasharray', '10,10').attr('class', 'line-error');
        }
        if (this.title) {
          title = vis.append('svg:text').attr('class', 'title').attr('transform', "translate(0, -" + this.line_height + ")").text(this.title);
        }
        this.legend = vis.append('svg:g').attr('transform', "translate(0, " + (this.height + this.line_height * 2) + ")").attr('class', 'legend');
      }
      leg_items = this.legend.selectAll('g.l').data(_.first(data, this.num_labels), function(d) {
        return Math.random();
      });
      leg_items.exit().remove();
      litem_enters = leg_items.enter().append('svg:g').attr('transform', (function(_this) {
        return function(d, i) {
          return "translate(" + ((i % _this.label_columns) * _this.label_offset) + ", " + (parseInt(i / _this.label_columns) * _this.line_height) + ")";
        };
      })(this)).attr('class', 'l');
      litem_enters.append('svg:rect').attr('width', 5).attr('height', 5).attr('class', function(d, i) {
        return 'ts-color ' + ("h-col-" + (i + 1));
      });
      litem_enters_a = litem_enters.append('svg:a').attr('xlink:href', (function(_this) {
        return function(d) {
          return _this.label_href(d.label);
        };
      })(this)).attr('class', 'l').attr('id', (function(_this) {
        return function(d, i) {
          return _this.name + "-" + i;
        };
      })(this));
      litem_enters_text = litem_enters_a.append('svg:text').attr('dx', 10).attr('dy', 6).attr('class', 'ts-text').text((function(_this) {
        return function(d) {
          return _this.label_formatter(d.label);
        };
      })(this));
      litem_enters_text.append('svg:tspan').attr('class', 'min-tag').attr('dx', 10).text((function(_this) {
        return function(d) {
          return _this.value_format(d.ymin) + "min";
        };
      })(this));
      litem_enters_text.append('svg:tspan').attr('class', 'max-tag').attr('dx', 2).text((function(_this) {
        return function(d) {
          return _this.value_format(d.ymax) + "max";
        };
      })(this));
      if (this.show_current === true) {
        litem_enters_text.append('svg:tspan').attr('class', 'last-tag').attr('dx', 2).text((function(_this) {
          return function(d) {
            return _this.value_format(d.last) + "last";
          };
        })(this));
      }
      vis.transition().ease("linear").duration(this.animate_ms).select(".x.axis").call(xAxis);
      vis.select(".y.axis").call(yAxis);
      vis.selectAll("path.area").data(points).attr("d", area).attr("id", (function(_this) {
        return function(d, i) {
          return "a-" + _this.name + "-" + i;
        };
      })(this)).transition().ease("linear").duration(this.animate_ms);
      vis.selectAll("path.line").data(points).attr("d", line).attr("id", (function(_this) {
        return function(d, i) {
          return "l-" + _this.name + "-" + i;
        };
      })(this)).transition().ease("linear").duration(this.animate_ms);
      return this.postrender(this.vis);
    };

    return TimeSeriesView;

  })(Backbone.Layout);

  Graphene.BarChartView = (function(superClass) {
    extend(BarChartView, superClass);

    function BarChartView() {
      this.render = bind(this.render, this);
      return BarChartView.__super__.constructor.apply(this, arguments);
    }

    BarChartView.prototype.tagName = 'div';

    BarChartView.prototype.initialize = function() {
      this.line_height = this.options.line_height || 16;
      this.animate_ms = this.options.animate_ms || 500;
      this.num_labels = this.options.num_labels || 3;
      this.sort_labels = this.options.labels_sort || 'desc';
      this.display_verticals = this.options.display_verticals || false;
      this.width = this.options.width || 400;
      this.height = this.options.height || 100;
      this.padding = this.options.padding || [this.line_height * 2, 32, this.line_height * (3 + this.num_labels), 32];
      this.title = this.options.title;
      this.label_formatter = this.options.label_formatter || function(label) {
            return label;
          };
      this.firstrun = true;
      this.parent = this.options.parent || '#parent';
      this.null_value = 0;
      this.value_format = this.options.value_format || ".3s";
      this.value_format = d3.format(this.value_format);
      this.vis = d3.select(this.parent).append("svg").attr("class", "tsview").attr("width", this.width + (this.padding[1] + this.padding[3])).attr("height", this.height + (this.padding[0] + this.padding[2])).append("g").attr("transform", "translate(" + this.padding[3] + "," + this.padding[0] + ")");
      //return this.model.bind('change', this.render);
      return this.listenTo(this.model, 'change', this.afterRender);
    };

    BarChartView.prototype.afterRender = function() {
      var barWidth, calculateX, calculateY, canvas_height, columnGroups, columnsPerGroup, columnsTotal, data, differences, dmax, dmin, leg_items, litem_enters, litem_enters_text, maxTimestamp, minTimestamp, orderedTimestamps, points, timestampDifference, timestamps, title, vis, x, xAxis, xtick_sz, y, yAxis;
      console.log("rendering bar chart.");
      data = this.model.get('data');
      dmax = _.max(data, function(d) {
        return d.ymax;
      });
      dmin = _.min(data, function(d) {
        return d.ymin;
      });
      data = _.sortBy(data, function(d) {
        return 1 * d.ymax;
      });
      points = _.map(data, function(d) {
        return d.points;
      });
      timestamps = _.flatten(_.map(points, function(series) {
        return _.map(series, function(point) {
          return point[1];
        });
      }));
      minTimestamp = _.min(timestamps);
      maxTimestamp = _.max(timestamps);
      orderedTimestamps = _.uniq(_.sortBy(timestamps, function(ts) {
        return ts;
      }), true, function(ts) {
        return ts.getTime();
      });
      differences = [];
      _.each(orderedTimestamps, function(ts, index, list) {
        if (list[index + 1] !== void 0) {
          return differences.push(list[index + 1] - ts);
        }
      });
      timestampDifference = _.min(differences);
      x = d3.time.scale().domain([minTimestamp, maxTimestamp + timestampDifference]).range([0, this.width]);
      y = d3.scale.linear().domain([dmin.ymin, dmax.ymax]).range([this.height, 0]).nice();
      columnGroups = (maxTimestamp - minTimestamp) / timestampDifference + 1;
      columnsPerGroup = points.length;
      columnsTotal = columnGroups * columnsPerGroup;
      barWidth = _.max([this.width / columnsTotal - 2, 0.1]);
      calculateX = function(d, outerIndex, innerIndex) {
        return x(d[1]) + innerIndex * (barWidth + 2);
      };
      calculateY = function(d) {
        return y(d[0]);
      };
      xtick_sz = this.display_verticals ? -this.height : 0;
      xAxis = d3.svg.axis().scale(x).ticks(_.min([4, columnGroups])).tickSize(xtick_sz).tickSubdivide(true);
      yAxis = d3.svg.axis().scale(y).ticks(4).tickSize(-this.width).orient("left").tickFormat(d3.format("s"));
      vis = this.vis;
      canvas_height = this.height;
      if (this.firstrun) {
        this.firstrun = false;
        vis.append("svg:g").attr("class", "x axis").attr("transform", "translate(0," + this.height + ")").transition().duration(this.animate_ms).call(xAxis);
        vis.append("svg:g").attr("class", "y axis").call(yAxis);
        if (this.title) {
          title = vis.append('svg:text').attr('class', 'title').attr('transform', "translate(0, -" + this.line_height + ")").text(this.title);
        }
        this.legend = vis.append('svg:g').attr('transform', "translate(0, " + (this.height + this.line_height * 2) + ")").attr('class', 'legend');
      }
      leg_items = this.legend.selectAll('g.l').data(_.first(data, this.num_labels), function(d) {
        return Math.random();
      });
      leg_items.exit().remove();
      litem_enters = leg_items.enter().append('svg:g').attr('transform', (function(_this) {
        return function(d, i) {
          return "translate(0, " + (i * _this.line_height) + ")";
        };
      })(this)).attr('class', 'l');
      litem_enters.append('svg:rect').attr('width', 5).attr('height', 5).attr('class', function(d, i) {
        return 'ts-color ' + ("h-col-" + (i + 1));
      });
      litem_enters_text = litem_enters.append('svg:text').attr('dx', 10).attr('dy', 6).attr('class', 'ts-text').text((function(_this) {
        return function(d) {
          return _this.label_formatter(d.label);
        };
      })(this));
      litem_enters_text.append('svg:tspan').attr('class', 'min-tag').attr('dx', 10).text((function(_this) {
        return function(d) {
          return _this.value_format(d.ymin) + "min";
        };
      })(this));
      litem_enters_text.append('svg:tspan').attr('class', 'max-tag').attr('dx', 2).text((function(_this) {
        return function(d) {
          return _this.value_format(d.ymax) + "max";
        };
      })(this));
      _.each(points, function(series, i) {
        var className;
        className = "h-col-" + (i + 1);
        return vis.selectAll("rect.area." + className).data(series).enter().append("rect").attr("class", className + " area").attr("x", function(d, j) {
          return calculateX(d, j, i);
        }).attr("y", canvas_height).attr("width", barWidth);
      });
      _.each(points, function(series, i) {
        var className;
        className = "h-col-" + (i + 1);
        return vis.selectAll("rect.area." + className).data(series).transition().ease("linear").duration(this.animate_ms).attr("x", function(d, j) {
          return calculateX(d, j, i);
        }).attr("y", function(d, j) {
          return calculateY(d);
        }).attr("width", barWidth).attr("height", function(d, j) {
          return canvas_height - calculateY(d);
        }).attr("class", className + " area");
      });
      vis.transition().ease("linear").duration(this.animate_ms).select(".x.axis").call(xAxis);
      vis.select(".y.axis").call(yAxis);
      return console.log("done drawing");
    };

    return BarChartView;

  })(Backbone.Layout);

  //from graphene.events.js
  function toggleHighlight(classVal, toggleVal) {
    function replaceAll(find, replace, str) {
      return str.replace(new RegExp(find, 'g'), replace);
    }

    if (classVal.indexOf(toggleVal) != -1) {
      return replaceAll("highlight", "", classVal)
    }
    else {
      return classVal + " " + toggleVal;
    }
  }

  //from graphene.events.js
  function postRenderTimeSeriesView(vis) {
    var svg = vis;
    svg.selectAll('a.l').forEach( function(g) {
      g.forEach(function(a){
        var aid = a.getAttribute('id')
        a.addEventListener('mouseenter', function() {
          svg.selectAll('path#l-' + aid).forEach ( function (g) {
            g.forEach(function (path) {
              path.setAttribute('class', toggleHighlight(path.getAttribute('class'), "line-highlight"));
            })
          })
          svg.selectAll('path#a-' + aid).forEach ( function (g) {
            g.forEach(function (path) {
              path.setAttribute('class', toggleHighlight(path.getAttribute('class'), "area-highlight"));
            })
          })
        })
        a.addEventListener('mouseleave', function() {
          svg.selectAll('path#l-' + aid).forEach ( function (g) {
            g.forEach(function (path) {
              path.setAttribute('class', toggleHighlight(path.getAttribute('class'), "line-highlight"));
            })
          })
          svg.selectAll('path#a-' + aid).forEach ( function (g) {
            g.forEach(function (path) {
              path.setAttribute('class', toggleHighlight(path.getAttribute('class'), "area-highlight"));
            })
          })
        })
      })
    })
  }

      return Graphene;
}
);


