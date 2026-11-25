(function () {
  'use strict';

  /* ========================================================================
   * TẦNG 1: BỘ LỌC & CHUẨN HÓA DỮ LIỆU ĐẦU VÀO (InputValidationLayer)
   * ======================================================================== */
  var InputValidationLayer = (function () {
    var WHITELIST_REGEX = /^[\d.\-;\s]+$/;
    var NUMBER_REGEX = /^-?\d+(\.\d+)?$/;
    var MIN_SAMPLE_SIZE = 3;
    var MAX_SAMPLE_SIZE = 40;

    function validateAndParse(rawInput) {
      if (typeof rawInput !== 'string') {
        return {
          ok: false,
          error: 'Đầu vào không hợp lệ.'
        };
      }

      var trimmedInput = rawInput.trim();
      if (trimmedInput.length === 0) {
        return {
          ok: false,
          error: 'Vui lòng nhập ít nhất 3 số thực, ngăn cách bởi dấu chấm phẩy (;).'
        };
      }

      // Tầng 1: Whitelist Regex (chỉ cho phép 0-9, ., -, ; và khoảng trắng)
      if (!WHITELIST_REGEX.test(trimmedInput)) {
        return {
          ok: false,
          error: 'Dữ liệu chỉ được chứa chữ số (0-9), dấu chấm (.), dấu trừ (-), dấu chấm phẩy (;) và khoảng trắng.'
        };
      }

      // Tầng 2: Tách chuỗi, bỏ phần tử rỗng ở cuối (nếu có dấu ; dư) và kiểm tra số thực
      var parts = trimmedInput.split(';');
      while (parts.length > 0 && parts[parts.length - 1].trim() === '') {
        parts.pop();
      }

      if (parts.length === 0) {
        return {
          ok: false,
          error: 'Không tìm thấy số liệu hợp lệ. Vui lòng nhập các số ngăn cách bởi dấu chấm phẩy (;).'
        };
      }

      var values = [];
      for (var i = 0; i < parts.length; i += 1) {
        var token = parts[i].trim();
        if (token === '') {
          return {
            ok: false,
            error: 'Phát hiện phần tử trống giữa các dấu chấm phẩy (;). Vui lòng kiểm tra lại chuỗi số liệu.'
          };
        }

        if (!NUMBER_REGEX.test(token)) {
          return {
            ok: false,
            error: 'Phần tử thứ ' + (i + 1) + ' không đúng định dạng số thực hợp lệ (ví dụ: 15 hoặc -3.5).'
          };
        }

        var num = Number(token);
        if (!Number.isFinite(num)) {
          return {
            ok: false,
            error: 'Giá trị ở phần tử thứ ' + (i + 1) + ' vượt quá giới hạn số thực cho phép.'
          };
        }

        values.push(num === 0 ? 0 : num);
      }

      // Tầng 3: Kiểm tra kích thước mẫu 3 <= n <= 40
      if (values.length < MIN_SAMPLE_SIZE) {
        return {
          ok: false,
          error: 'Cần ít nhất ' + MIN_SAMPLE_SIZE + ' số liệu để xác định tứ phân vị (hiện có ' + values.length + ' số).'
        };
      }

      if (values.length > MAX_SAMPLE_SIZE) {
        return {
          ok: false,
          error: 'Số lượng phần tử tối đa là ' + MAX_SAMPLE_SIZE + ' để đảm bảo biểu đồ rõ nét (hiện có ' + values.length + ' số).'
        };
      }

      return {
        ok: true,
        values: values
      };
    }

    return {
      validateAndParse: validateAndParse
    };
  })();

  /* ========================================================================
   * TẦNG 2: TÍNH TOÁN THỐNG KÊ THUẦN TÚY & QUY ĐỔI TỌA ĐỘ
   * ======================================================================== */
  var StatisticsLayer = (function () {
    function roundClean(num) {
      var rounded = Number(num.toFixed(6));
      return rounded === 0 ? 0 : rounded;
    }

    function formatNumber(num) {
      if (!Number.isFinite(num)) {
        return '—';
      }
      return String(roundClean(num));
    }

    function computeMedianDescriptor(sorted, startIndex0, endIndex0) {
      var length = endIndex0 - startIndex0 + 1;
      if (length % 2 === 1) {
        var mid0 = startIndex0 + (length - 1) / 2;
        var exactVal = roundClean(sorted[mid0]);
        return {
          value: exactVal,
          isExact: true,
          rank: mid0 + 1,
          leftRank: mid0 + 1,
          rightRank: mid0 + 1,
          leftVal: exactVal,
          rightVal: exactVal,
          subsetLength: length,
          subsetStartRank: startIndex0 + 1,
          subsetEndRank: endIndex0 + 1
        };
      }

      var left0 = startIndex0 + length / 2 - 1;
      var right0 = left0 + 1;
      var leftVal = roundClean(sorted[left0]);
      var rightVal = roundClean(sorted[right0]);
      var avgVal = roundClean((leftVal + rightVal) / 2);

      return {
        value: avgVal,
        isExact: false,
        rank: left0 + 1.5,
        leftRank: left0 + 1,
        rightRank: right0 + 1,
        leftVal: leftVal,
        rightVal: rightVal,
        subsetLength: length,
        subsetStartRank: startIndex0 + 1,
        subsetEndRank: endIndex0 + 1
      };
    }

    function analyzeDataset(rawValues) {
      var sorted = rawValues.slice().sort(function (a, b) {
        return a - b;
      });

      var n = sorted.length;
      var isOdd = n % 2 === 1;
      var k = Math.floor(n / 2);

      var q2 = computeMedianDescriptor(sorted, 0, n - 1);
      var lowerStart0 = 0;
      var lowerEnd0 = k - 1;
      var upperStart0 = isOdd ? k + 1 : k;
      var upperEnd0 = n - 1;

      var q1 = computeMedianDescriptor(sorted, lowerStart0, lowerEnd0);
      var q3 = computeMedianDescriptor(sorted, upperStart0, upperEnd0);
      var iqr = roundClean(q3.value - q1.value);

      return {
        n: n,
        isOdd: isOdd,
        k: k,
        sorted: sorted,
        yMin: sorted[0],
        yMax: sorted[n - 1],
        q1: q1,
        q2: q2,
        q3: q3,
        iqr: iqr
      };
    }

    return {
      formatNumber: formatNumber,
      analyzeDataset: analyzeDataset
    };
  })();

  var CoordinateLayer = (function () {
    var VIEW_WIDTH = 920;
    var VIEW_HEIGHT = 440;
    var MARGINS = {
      top: 34,
      right: 112,
      bottom: 52,
      left: 68
    };

    function computeNiceStep(roughStep) {
      if (roughStep <= 0) {
        return 1;
      }
      var exponent = Math.floor(Math.log10(roughStep));
      var fraction = roughStep / Math.pow(10, exponent);
      var niceFraction;

      if (fraction <= 1) {
        niceFraction = 1;
      } else if (fraction <= 2) {
        niceFraction = 2;
      } else if (fraction <= 2.5) {
        niceFraction = 2.5;
      } else if (fraction <= 5) {
        niceFraction = 5;
      } else {
        niceFraction = 10;
      }

      return niceFraction * Math.pow(10, exponent);
    }

    function computeYTicks(domainMin, domainMax) {
      var span = domainMax - domainMin;
      var targetCount = 6;
      var step = computeNiceStep(span / targetCount);
      var firstTick = Math.ceil(domainMin / step) * step;
      var ticks = [];

      for (var val = firstTick; val <= domainMax + step * 1e-9; val += step) {
        var clean = Number(val.toFixed(6));
        ticks.push(clean === 0 ? 0 : clean);
      }

      if (ticks.length < 2) {
        var mid = Number(((domainMin + domainMax) / 2).toFixed(6));
        ticks = [Number(domainMin.toFixed(2)), mid === 0 ? 0 : mid, Number(domainMax.toFixed(2))];
      }

      return ticks;
    }

    function buildScale(analysis) {
      var plotLeft = MARGINS.left;
      var plotRight = VIEW_WIDTH - MARGINS.right;
      var plotTop = MARGINS.top;
      var plotBottom = VIEW_HEIGHT - MARGINS.bottom;
      var plotWidth = plotRight - plotLeft;
      var plotHeight = plotBottom - plotTop;

      var yMin = analysis.yMin;
      var yMax = analysis.yMax;
      var domainMin;
      var domainMax;

      if (yMax === yMin) {
        var centerPad = Math.max(Math.abs(yMin) * 0.2, 5);
        domainMin = yMin - centerPad;
        domainMax = yMax + centerPad;
      } else {
        var pad = (yMax - yMin) * 0.12;
        domainMin = yMin - pad;
        domainMax = yMax + pad;
      }

      var ySpan = domainMax - domainMin;
      var xInset = Math.min(34, plotWidth / (analysis.n + 1));
      var usableXSpan = plotWidth - xInset * 2;

      function xForRank(rank) {
        if (analysis.n === 1) {
          return plotLeft + plotWidth / 2;
        }
        return plotLeft + xInset + ((rank - 1) / (analysis.n - 1)) * usableXSpan;
      }

      function yForValue(val) {
        return plotBottom - ((val - domainMin) / ySpan) * plotHeight;
      }

      return {
        viewWidth: VIEW_WIDTH,
        viewHeight: VIEW_HEIGHT,
        plotLeft: plotLeft,
        plotRight: plotRight,
        plotTop: plotTop,
        plotBottom: plotBottom,
        plotWidth: plotWidth,
        plotHeight: plotHeight,
        domainMin: domainMin,
        domainMax: domainMax,
        yTicks: computeYTicks(domainMin, domainMax),
        xForRank: xForRank,
        yForValue: yForValue
      };
    }

    return {
      buildScale: buildScale
    };
  })();

  /* ========================================================================
   * TẦNG 3: DỰNG HÌNH SVG & CẬP NHẬT DOM (RenderLayer)
   * ======================================================================== */
  var RenderLayer = (function () {
    var SVG_NS = 'http://www.w3.org/2000/svg';

    function createSvgElement(tag, className, attrs) {
      var el = document.createElementNS(SVG_NS, tag);
      if (className) {
        el.setAttribute('class', className);
      }
      if (attrs) {
        var keys = Object.keys(attrs);
        for (var i = 0; i < keys.length; i += 1) {
          el.setAttribute(keys[i], String(attrs[keys[i]]));
        }
      }
      return el;
    }

    function createDomElement(tag, className, text) {
      var el = document.createElement(tag);
      if (className) {
        el.className = className;
      }
      if (typeof text === 'string') {
        el.textContent = text;
      }
      return el;
    }

    function buildQuartileLabelLayout(items, plotTop, plotBottom) {
      var sorted = items.slice().sort(function (a, b) {
        return a.y - b.y;
      });
      var minGap = 22;

      for (var i = 1; i < sorted.length; i += 1) {
        if (sorted[i].labelY - sorted[i - 1].labelY < minGap) {
          sorted[i].labelY = sorted[i - 1].labelY + minGap;
        }
      }

      for (var j = sorted.length - 1; j >= 0; j -= 1) {
        if (sorted[j].labelY > plotBottom - 10) {
          sorted[j].labelY = plotBottom - 10;
        }
        if (j > 0 && sorted[j].labelY - sorted[j - 1].labelY < minGap) {
          sorted[j - 1].labelY = sorted[j].labelY - minGap;
        }
      }

      if (sorted.length > 0 && sorted[0].labelY < plotTop + 10) {
        sorted[0].labelY = plotTop + 10;
        for (var k = 1; k < sorted.length; k += 1) {
          if (sorted[k].labelY - sorted[k - 1].labelY < minGap) {
            sorted[k].labelY = sorted[k - 1].labelY + minGap;
          }
        }
      }

      return sorted;
    }

    function renderChart(svgEl, analysis, scale, layers, tooltipController) {
      svgEl.setAttribute('viewBox', '0 0 ' + scale.viewWidth + ' ' + scale.viewHeight);
      svgEl.replaceChildren();

      // 1. Nền vùng vẽ & lưới ngang trục Y
      svgEl.appendChild(
        createSvgElement('rect', 'da-svg-plot-bg', {
          x: scale.plotLeft,
          y: scale.plotTop,
          width: scale.plotWidth,
          height: scale.plotHeight
        })
      );

      var gridGroup = createSvgElement('g', 'da-svg-grid-group');
      for (var t = 0; t < scale.yTicks.length; t += 1) {
        var tickVal = scale.yTicks[t];
        var ty = scale.yForValue(tickVal);
        gridGroup.appendChild(
          createSvgElement('line', 'da-svg-gridline', {
            x1: scale.plotLeft,
            y1: ty,
            x2: scale.plotRight,
            y2: ty
          })
        );
      }
      svgEl.appendChild(gridGroup);

      // 2. Lớp Khoảng tứ phân vị (IQR Band) đặt phía sau đường & điểm
      if (layers.showIqr) {
        var yQ3 = scale.yForValue(analysis.q3.value);
        var yQ1 = scale.yForValue(analysis.q1.value);
        var bandTop = Math.min(yQ3, yQ1);
        var bandHeight = Math.max(0, Math.abs(yQ1 - yQ3));

        var iqrBandGroup = createSvgElement('g', 'da-svg-iqr-band-group');
        iqrBandGroup.appendChild(
          createSvgElement('rect', 'da-svg-iqr-band', {
            x: scale.plotLeft,
            y: bandTop,
            width: scale.plotWidth,
            height: bandHeight
          })
        );

        if (bandHeight >= 18) {
          var bracketX = scale.plotLeft + 14;
          iqrBandGroup.appendChild(
            createSvgElement('path', 'da-svg-iqr-bracket', {
              d:
                'M ' + (bracketX + 5) + ' ' + bandTop +
                ' L ' + bracketX + ' ' + bandTop +
                ' L ' + bracketX + ' ' + (bandTop + bandHeight) +
                ' L ' + (bracketX + 5) + ' ' + (bandTop + bandHeight)
            })
          );
          var iqrText = createSvgElement('text', 'da-svg-iqr-label', {
            x: bracketX + 9,
            y: bandTop + bandHeight / 2,
            'dominant-baseline': 'central'
          });
          iqrText.textContent = 'ΔQ = ' + StatisticsLayer.formatNumber(analysis.iqr);
          iqrBandGroup.appendChild(iqrText);
        }
        svgEl.appendChild(iqrBandGroup);
      }

      // 3. Trục tọa độ X, Y và các vạch chia
      var axesGroup = createSvgElement('g', 'da-svg-axes-group');

      // Trục Y
      axesGroup.appendChild(
        createSvgElement('line', 'da-svg-axis', {
          x1: scale.plotLeft,
          y1: scale.plotTop,
          x2: scale.plotLeft,
          y2: scale.plotBottom
        })
      );

      // Trục X
      axesGroup.appendChild(
        createSvgElement('line', 'da-svg-axis', {
          x1: scale.plotLeft,
          y1: scale.plotBottom,
          x2: scale.plotRight,
          y2: scale.plotBottom
        })
      );

      // Nhãn & vạch chia trục Y
      for (var yi = 0; yi < scale.yTicks.length; yi += 1) {
        var yTickVal = scale.yTicks[yi];
        var yPos = scale.yForValue(yTickVal);

        axesGroup.appendChild(
          createSvgElement('line', 'da-svg-tick', {
            x1: scale.plotLeft - 5,
            y1: yPos,
            x2: scale.plotLeft,
            y2: yPos
          })
        );

        var yLabel = createSvgElement('text', 'da-svg-tick-label', {
          x: scale.plotLeft - 10,
          y: yPos,
          'text-anchor': 'end',
          'dominant-baseline': 'central'
        });
        yLabel.textContent = StatisticsLayer.formatNumber(yTickVal);
        axesGroup.appendChild(yLabel);
      }

      // Nhãn & vạch chia trục X (vị trí từ 1 đến n)
      for (var rank = 1; rank <= analysis.n; rank += 1) {
        var xPos = scale.xForRank(rank);
        axesGroup.appendChild(
          createSvgElement('line', 'da-svg-tick', {
            x1: xPos,
            y1: scale.plotBottom,
            x2: xPos,
            y2: scale.plotBottom + 5
          })
        );

        var xLabel = createSvgElement('text', 'da-svg-tick-label', {
          x: xPos,
          y: scale.plotBottom + 18,
          'text-anchor': 'middle'
        });
        xLabel.textContent = String(rank);
        axesGroup.appendChild(xLabel);
      }

      var xAxisTitle = createSvgElement('text', 'da-svg-axis-title', {
        x: scale.plotLeft + scale.plotWidth / 2,
        y: scale.viewHeight - 8,
        'text-anchor': 'middle'
      });
      xAxisTitle.textContent = 'Vị trí thứ hạng (i)';
      axesGroup.appendChild(xAxisTitle);

      var yAxisTitle = createSvgElement('text', 'da-svg-axis-title', {
        x: scale.plotLeft,
        y: scale.plotTop - 14,
        'text-anchor': 'start'
      });
      yAxisTitle.textContent = 'Giá trị x(i)';
      axesGroup.appendChild(yAxisTitle);

      svgEl.appendChild(axesGroup);

      // 4. Lớp Dãy số liệu sắp thứ tự không giảm (đường gióng dọc + đường gấp khúc)
      if (layers.showSeries) {
        var guidesGroup = createSvgElement('g', 'da-svg-vguides-group');
        var polylinePoints = [];

        for (var i = 0; i < analysis.n; i += 1) {
          var ptX = scale.xForRank(i + 1);
          var ptY = scale.yForValue(analysis.sorted[i]);
          polylinePoints.push(ptX.toFixed(2) + ',' + ptY.toFixed(2));

          guidesGroup.appendChild(
            createSvgElement('line', 'da-svg-vguide', {
              x1: ptX,
              y1: scale.plotBottom,
              x2: ptX,
              y2: ptY
            })
          );
        }

        svgEl.appendChild(guidesGroup);
        svgEl.appendChild(
          createSvgElement('polyline', 'da-svg-series-line', {
            points: polylinePoints.join(' ')
          })
        );
      }

      // 5. Chuẩn bị & vẽ các đường gióng ngang Q1, Q2, Q3 từ trục Y
      var activeQuartileLines = [];
      if (layers.showIqr) {
        activeQuartileLines.push({
          key: 'Q1',
          descriptor: analysis.q1,
          tone: 'amber',
          y: scale.yForValue(analysis.q1.value),
          labelY: scale.yForValue(analysis.q1.value)
        });
        activeQuartileLines.push({
          key: 'Q3',
          descriptor: analysis.q3,
          tone: 'amber',
          y: scale.yForValue(analysis.q3.value),
          labelY: scale.yForValue(analysis.q3.value)
        });
      }
      if (layers.showQ2) {
        activeQuartileLines.push({
          key: 'Q2',
          descriptor: analysis.q2,
          tone: 'green',
          y: scale.yForValue(analysis.q2.value),
          labelY: scale.yForValue(analysis.q2.value)
        });
      }

      var placedLabels = buildQuartileLabelLayout(
        activeQuartileLines,
        scale.plotTop,
        scale.plotBottom
      );

      var quartileLinesGroup = createSvgElement('g', 'da-svg-quartiles-group');

      for (var qIdx = 0; qIdx < placedLabels.length; qIdx += 1) {
        var qItem = placedLabels[qIdx];
        var lineClass = 'da-svg-q-line da-svg-q-' + qItem.tone;

        quartileLinesGroup.appendChild(
          createSvgElement('line', lineClass, {
            x1: scale.plotLeft,
            y1: qItem.y,
            x2: scale.plotRight,
            y2: qItem.y
          })
        );

        // Nếu mốc nằm giữa 2 vị trí, vẽ đoạn nối hai điểm liền kề + đường gióng đứng xuống trục X
        if (!qItem.descriptor.isExact) {
          var lx = scale.xForRank(qItem.descriptor.leftRank);
          var ly = scale.yForValue(qItem.descriptor.leftVal);
          var rx = scale.xForRank(qItem.descriptor.rightRank);
          var ry = scale.yForValue(qItem.descriptor.rightVal);
          var mx = scale.xForRank(qItem.descriptor.rank);
          var my = scale.yForValue(qItem.descriptor.value);

          quartileLinesGroup.appendChild(
            createSvgElement('line', 'da-svg-q-vtick da-svg-q-vtick-' + qItem.tone, {
              x1: mx,
              y1: my,
              x2: mx,
              y2: scale.plotBottom
            })
          );

          quartileLinesGroup.appendChild(
            createSvgElement('line', 'da-svg-mid-segment da-svg-mid-' + qItem.tone, {
              x1: lx,
              y1: ly,
              x2: rx,
              y2: ry
            })
          );
        }

        // Nhãn giá trị mốc tứ phân vị bên phải vùng vẽ
        var labelText = qItem.key + ' = ' + StatisticsLayer.formatNumber(qItem.descriptor.value);
        var badgeWidth = Math.max(66, labelText.length * 7.2 + 12);
        var badgeX = scale.plotRight + 8;
        var badgeY = qItem.labelY - 10;

        if (Math.abs(qItem.labelY - qItem.y) > 2) {
          quartileLinesGroup.appendChild(
            createSvgElement('line', 'da-svg-q-line da-svg-q-' + qItem.tone, {
              x1: scale.plotRight,
              y1: qItem.y,
              x2: badgeX,
              y2: qItem.labelY
            })
          );
        }

        quartileLinesGroup.appendChild(
          createSvgElement('rect', 'da-svg-q-badge-bg da-svg-q-badge-' + qItem.tone, {
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: 20,
            rx: 5
          })
        );

        var badgeLabel = createSvgElement('text', 'da-svg-q-label da-svg-q-label-' + qItem.tone, {
          x: badgeX + 6,
          y: qItem.labelY,
          'dominant-baseline': 'central'
        });
        badgeLabel.textContent = labelText;
        quartileLinesGroup.appendChild(badgeLabel);
      }
      svgEl.appendChild(quartileLinesGroup);

      // 6. Các điểm dữ liệu tương tác (hiển thị khi bật Lớp Dãy số liệu)
      if (layers.showSeries) {
        var pointsGroup = createSvgElement('g', 'da-svg-points-group');
        for (var p = 0; p < analysis.n; p += 1) {
          (function (index) {
            var pointRank = index + 1;
            var pointVal = analysis.sorted[index];
            var cx = scale.xForRank(pointRank);
            var cy = scale.yForValue(pointVal);

            var group = createSvgElement('g', 'da-svg-point-group', {
              tabindex: '0',
              role: 'button',
              'aria-label': 'Vị trí ' + pointRank + ', Giá trị ' + StatisticsLayer.formatNumber(pointVal)
            });

            group.appendChild(
              createSvgElement('circle', 'da-svg-point', {
                cx: cx,
                cy: cy,
                r: 5
              })
            );

            group.appendChild(
              createSvgElement('circle', 'da-svg-hit', {
                cx: cx,
                cy: cy,
                r: 14
              })
            );

            var show = function () {
              group.classList.add('is-active');
              tooltipController.show(pointRank, pointVal, cx, cy, scale);
            };
            var hide = function () {
              group.classList.remove('is-active');
              tooltipController.hide();
            };

            group.addEventListener('pointerenter', show);
            group.addEventListener('pointerleave', hide);
            group.addEventListener('focus', show);
            group.addEventListener('blur', hide);
            group.addEventListener('click', function (evt) {
              evt.stopPropagation();
              show();
            });

            pointsGroup.appendChild(group);
          })(p);
        }
        svgEl.appendChild(pointsGroup);
      }

      // 7. Vòng & dấu chấm nổi bật cho mốc Q1, Q3 và Q2 (đặt trên cùng để luôn rõ)
      var markersGroup = createSvgElement('g', 'da-svg-q-markers-group');
      for (var m = 0; m < activeQuartileLines.length; m += 1) {
        var qMark = activeQuartileLines[m];
        var mxPos = scale.xForRank(qMark.descriptor.rank);
        var myPos = scale.yForValue(qMark.descriptor.value);

        markersGroup.appendChild(
          createSvgElement('circle', 'da-svg-q-ring da-svg-q-ring-' + qMark.tone, {
            cx: mxPos,
            cy: myPos,
            r: 10
          })
        );

        markersGroup.appendChild(
          createSvgElement('circle', 'da-svg-q-dot da-svg-q-dot-' + qMark.tone, {
            cx: mxPos,
            cy: myPos,
            r: 5.5
          })
        );
      }
      svgEl.appendChild(markersGroup);
    }

    function renderOrderedSequence(containerEl, parityNoteEl, analysis) {
      containerEl.replaceChildren();
      parityNoteEl.textContent =
        'n = ' + analysis.n + ' (' + (analysis.isOdd ? 'cỡ mẫu lẻ' : 'cỡ mẫu chẵn') + ')';

      for (var i = 0; i < analysis.n; i += 1) {
        var rank = i + 1;
        var val = analysis.sorted[i];
        var tags = [];
        var classes = ['da-seq-item'];

        if (analysis.q1.isExact && analysis.q1.rank === rank) {
          classes.push('is-q1');
          tags.push('Q1');
        }
        if (analysis.q2.isExact && analysis.q2.rank === rank) {
          classes.push('is-q2');
          tags.push('Q2');
        }
        if (analysis.q3.isExact && analysis.q3.rank === rank) {
          classes.push('is-q3');
          tags.push('Q3');
        }

        var item = createDomElement('div', classes.join(' '));
        item.setAttribute('role', 'listitem');

        var rankSpan = createDomElement('span', 'da-seq-rank', '#' + rank);
        var valSpan = createDomElement('span', 'da-seq-val', StatisticsLayer.formatNumber(val));

        item.appendChild(rankSpan);
        item.appendChild(valSpan);

        if (tags.length > 0) {
          var tagSpan = createDomElement('span', 'da-seq-tag', tags.join(' / '));
          item.appendChild(tagSpan);
        }

        containerEl.appendChild(item);
      }
    }

    function renderSummaryMetrics(elements, analysis) {
      elements.n.textContent = String(analysis.n);
      elements.q1.textContent = StatisticsLayer.formatNumber(analysis.q1.value);
      elements.q2.textContent = StatisticsLayer.formatNumber(analysis.q2.value);
      elements.q3.textContent = StatisticsLayer.formatNumber(analysis.q3.value);
      elements.iqr.textContent = StatisticsLayer.formatNumber(analysis.iqr);
    }

    function describeMedianStep(label, desc, contextText) {
      var li = createDomElement('li', 'da-explain-step');
      var titleSpan = createDomElement('span', 'da-explain-step-label', label + ': ');
      li.appendChild(titleSpan);

      li.appendChild(document.createTextNode(contextText + ' '));

      var mathSpan = createDomElement('span', 'da-explain-math');
      if (desc.isExact) {
        mathSpan.textContent =
          'Vị trí ' + desc.rank + ' → ' + label + ' = x(' + desc.rank + ') = ' +
          StatisticsLayer.formatNumber(desc.value) + '.';
      } else {
        mathSpan.textContent =
          'Vị trí ' + desc.leftRank + ' & ' + desc.rightRank + ' (mốc ' + desc.rank + ') → ' +
          label + ' = (' + StatisticsLayer.formatNumber(desc.leftVal) + ' + ' +
          StatisticsLayer.formatNumber(desc.rightVal) + ') / 2 = ' +
          StatisticsLayer.formatNumber(desc.value) + '.';
      }
      li.appendChild(mathSpan);
      return li;
    }

    function renderExplanation(leadEl, stepsEl, analysis) {
      leadEl.textContent =
        'Dãy gồm n = ' + analysis.n + ' số liệu (' +
        (analysis.isOdd ? 'lẻ, n = 2·' + analysis.k + ' + 1' : 'chẵn, n = 2·' + analysis.k) +
        ') đã được sắp xếp theo thứ tự không giảm từ vị trí 1 đến ' + analysis.n + '.';

      stepsEl.replaceChildren();

      // Bước 1: Q2
      var q2Context = analysis.isOdd
        ? 'Vì n lẻ nên trung vị là phần tử đứng chính giữa dãy (vị trí (n + 1)/2).'
        : 'Vì n chẵn nên trung vị là trung bình cộng của hai phần tử chính giữa ở vị trí k và k + 1.';
      stepsEl.appendChild(describeMedianStep('Trung vị Q2', analysis.q2, q2Context));

      // Bước 2: Q1
      var q1Context =
        'Nửa dưới gồm ' + analysis.q1.subsetLength + ' phần tử (từ vị trí ' +
        analysis.q1.subsetStartRank + ' đến ' + analysis.q1.subsetEndRank +
        (analysis.isOdd ? ', không gồm Q2' : '') + ').';
      stepsEl.appendChild(describeMedianStep('Tứ phân vị Q1', analysis.q1, q1Context));

      // Bước 3: Q3
      var q3Context =
        'Nửa trên gồm ' + analysis.q3.subsetLength + ' phần tử (từ vị trí ' +
        analysis.q3.subsetStartRank + ' đến ' + analysis.q3.subsetEndRank +
        (analysis.isOdd ? ', không gồm Q2' : '') + ').';
      stepsEl.appendChild(describeMedianStep('Tứ phân vị Q3', analysis.q3, q3Context));

      // Bước 4: ΔQ
      var iqrLi = createDomElement('li', 'da-explain-step');
      iqrLi.appendChild(createDomElement('span', 'da-explain-step-label', 'Khoảng tứ phân vị ΔQ: '));
      iqrLi.appendChild(document.createTextNode('Đo độ phân tán của 50% số liệu ở giữa dãy: '));
      iqrLi.appendChild(
        createDomElement(
          'span',
          'da-explain-math',
          'ΔQ = Q3 - Q1 = ' +
            StatisticsLayer.formatNumber(analysis.q3.value) +
            ' - ' +
            StatisticsLayer.formatNumber(analysis.q1.value) +
            ' = ' +
            StatisticsLayer.formatNumber(analysis.iqr) +
            '.'
        )
      );
      stepsEl.appendChild(iqrLi);
    }

    return {
      renderChart: renderChart,
      renderOrderedSequence: renderOrderedSequence,
      renderSummaryMetrics: renderSummaryMetrics,
      renderExplanation: renderExplanation
    };
  })();

  /* ========================================================================
   * KHỞI TẠO & ĐIỀU PHỐI ỨNG DỤNG
   * ======================================================================== */
  var PRESETS = {
    odd: '12; 15; 10; 22; 18; 15; 25; 19; 14',
    even: '24; 18; 31; 15; 20; 28; 22; 17; 26; 19',
    outlier: '14; 16; 15; 18; 17; 15; 19; 16; 48',
    negDecimal: '-4.5; 2.3; -1.2; 0; 3.8; -3.1; 1.5; -0.4; 4.2; -2.0; 2.9'
  };

  function init() {
    var formEl = document.getElementById('da-input-form');
    var inputEl = document.getElementById('da-data-input');
    var errorEl = document.getElementById('da-error-msg');
    var presetsGroupEl = document.getElementById('da-presets-group');

    var layerSeriesEl = document.getElementById('da-layer-series');
    var layerQ2El = document.getElementById('da-layer-q2');
    var layerIqrEl = document.getElementById('da-layer-iqr');

    var chartStageEl = document.getElementById('da-chart-stage');
    var svgEl = document.getElementById('da-chart-svg');
    var tooltipEl = document.getElementById('da-tooltip');
    var tooltipRankEl = document.getElementById('da-tooltip-rank');
    var tooltipValueEl = document.getElementById('da-tooltip-value');

    var seqStripEl = document.getElementById('da-seq-strip');
    var parityNoteEl = document.getElementById('da-parity-note');
    var statEls = {
      n: document.getElementById('da-stat-n'),
      q1: document.getElementById('da-stat-q1'),
      q2: document.getElementById('da-stat-q2'),
      q3: document.getElementById('da-stat-q3'),
      iqr: document.getElementById('da-stat-iqr')
    };

    var explainLeadEl = document.getElementById('da-explain-lead');
    var explainStepsEl = document.getElementById('da-explain-steps');

    var state = {
      values: [],
      analysis: null,
      activePreset: 'odd'
    };

    var tooltipController = {
      show: function (rank, value, svgX, svgY, scale) {
        tooltipRankEl.textContent = String(rank);
        tooltipValueEl.textContent = StatisticsLayer.formatNumber(value);
        tooltipEl.hidden = false;

        var leftPct = (svgX / scale.viewWidth) * 100;
        var topPct = (svgY / scale.viewHeight) * 100;
        var clampedLeft = Math.max(10, Math.min(90, leftPct));
        var offsetY = svgY < 92 ? 18 : -14;

        tooltipEl.style.left = clampedLeft + '%';
        tooltipEl.style.top = topPct + '%';
        tooltipEl.style.transform =
          svgY < 92 ? 'translate(-50%, ' + offsetY + 'px)' : 'translate(-50%, calc(-100% + ' + offsetY + 'px))';
      },
      hide: function () {
        tooltipEl.hidden = true;
      }
    };

    function getLayersState() {
      return {
        showSeries: layerSeriesEl.checked,
        showQ2: layerQ2El.checked,
        showIqr: layerIqrEl.checked
      };
    }

    function setError(message) {
      if (message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
        inputEl.classList.add('da-input-invalid');
        inputEl.setAttribute('aria-invalid', 'true');
      } else {
        errorEl.textContent = '';
        errorEl.hidden = true;
        inputEl.classList.remove('da-input-invalid');
        inputEl.removeAttribute('aria-invalid');
      }
    }

    function updateActivePresetButtons(activeKey) {
      var buttons = presetsGroupEl.querySelectorAll('[data-preset]');
      for (var i = 0; i < buttons.length; i += 1) {
        var btn = buttons[i];
        if (btn.getAttribute('data-preset') === activeKey) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      }
    }

    function renderAll() {
      if (!state.analysis) {
        return;
      }
      tooltipController.hide();
      var scale = CoordinateLayer.buildScale(state.analysis);
      RenderLayer.renderChart(svgEl, state.analysis, scale, getLayersState(), tooltipController);
      RenderLayer.renderOrderedSequence(seqStripEl, parityNoteEl, state.analysis);
      RenderLayer.renderSummaryMetrics(statEls, state.analysis);
      RenderLayer.renderExplanation(explainLeadEl, explainStepsEl, state.analysis);
    }

    function applyRawInput(rawString, presetKey) {
      var result = InputValidationLayer.validateAndParse(rawString);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setError('');
      state.values = result.values;
      state.analysis = StatisticsLayer.analyzeDataset(result.values);
      state.activePreset = presetKey || '';
      updateActivePresetButtons(state.activePreset);
      renderAll();
    }

    formEl.addEventListener('submit', function (evt) {
      evt.preventDefault();
      applyRawInput(inputEl.value, '');
    });

    presetsGroupEl.addEventListener('click', function (evt) {
      var target = evt.target;
      if (!target || typeof target.getAttribute !== 'function') {
        return;
      }
      var presetKey = target.getAttribute('data-preset');
      if (!presetKey || !Object.prototype.hasOwnProperty.call(PRESETS, presetKey)) {
        return;
      }
      inputEl.value = PRESETS[presetKey];
      applyRawInput(PRESETS[presetKey], presetKey);
    });

    var layerInputs = [layerSeriesEl, layerQ2El, layerIqrEl];
    for (var i = 0; i < layerInputs.length; i += 1) {
      layerInputs[i].addEventListener('change', function () {
        if (!state.analysis) {
          return;
        }
        tooltipController.hide();
        var scale = CoordinateLayer.buildScale(state.analysis);
        RenderLayer.renderChart(svgEl, state.analysis, scale, getLayersState(), tooltipController);
      });
    }

    chartStageEl.addEventListener('click', function () {
      tooltipController.hide();
      var activePoints = svgEl.querySelectorAll('.da-svg-point-group.is-active');
      for (var j = 0; j < activePoints.length; j += 1) {
        activePoints[j].classList.remove('is-active');
      }
    });

    // Nạp mẫu mặc định ban đầu
    inputEl.value = PRESETS.odd;
    applyRawInput(PRESETS.odd, 'odd');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
