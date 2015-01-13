/**
 * Created by al on 17.09.14.
 */

angular.module('diagram',[])
    .directive('lineDiagram', function($compile) {

        function getContentData(data, scale, from) {

            var content = {
                    rects: [],
                    labels: []
                },
                label_y = 33,
                rect_y = 15,
                delta_y = 30,
                offset = 15.5,
                labelsWidths = getLabelsWidths(data),
                globalOffset = labelsWidths[0].val;

            for(var i= 0, j= data.length; i<j; i++) {
                var current = data[i],
                    currentLabelOffset;

                for(var i1= 0, j1= labelsWidths.length; i1<j1; i1++) {
                    if(labelsWidths[i1].name == current.label) {
                        currentLabelOffset = labelsWidths[i1].val;
                    }
                }

                content.labels.push({
                        text: current.label,
                        y: label_y,
                        x: globalOffset - currentLabelOffset
                    });

                for(var k= 0, l= current.data.length; k<l; k++) {
                    var currentData = current.data[k],
                        width = ((currentData.end - currentData.begin) / 1000) * scale,
                        x = ((currentData.begin - from) / 1000) * scale + offset + globalOffset;

                    content.rects.push({
                        id: 'rect' + i,
                        x: x,
                        y: rect_y,
                        width: width,
                        color: currentData.color
                    });
                }

                rect_y += delta_y;
                label_y += delta_y;
            }

            return content;
        }

        var getLabelsWidths = (function() {
            var result = [];

            return function(data) {
                if(result.length == 0) {

                    data.forEach(function(element) {
                        var obj = $('<span>'+element.label+'</span>').appendTo('body');
                        result.push({
                            name: element.label,
                            val: obj.width()
                        });
                        obj.remove();
                    });
                    result.sort(function(a,b) {
                        return b.val - a.val;
                    });
                }

                return result;
            }

        })();

        function getStepOfTimeNet(from, to){
            var delta = (to - from) / (1000 * 60);
            // todo функция плохо работает с промежутками 1.50 и тд...
            if(delta <= 30) {
                return 5;
            } else if(delta <= 60) {
                return 5;
            } else if(delta <= 180) {
                return 15;
            } else if(delta <= 300) {
                return 30;
            } else {
                return 60;
            }
        }

        return {
            restrict: 'E',
            scope: {
                from: '=',
                to: '=',
                data: '='
            },
            link: function(scope, element, attrs) {

                scope.width = attrs.width || element.parent().width(); // todo отладить случай, когда в параметр передаются прценты
                scope.height = attrs.height || element.parent().height();

                var addResizeEvent = false;

                if(scope.width.search('%')) {
                    scope.width = element.parent().width() * (parseInt(scope.width, 10) / 100);
                    addResizeEvent = true;
                }

                if(scope.height.search('%')) {
                    scope.height = element.parent().height() * (parseInt(scope.height, 10) / 100);
                    addResizeEvent = true;
                }

                if(addResizeEvent) {
                    angular.element(window).on('resize', function() {
                        scope.resizer();
                    });
                    angular.element(window).on('click', function() {
                        scope.resizer();
                    });
                }

                var windowOffset = getLabelsWidths(scope.data)[0].val;

                var diagramWindowWidth = scope.width - windowOffset;

                var timeStep = getStepOfTimeNet(scope.from, scope.to),
                    stepsCount = ((scope.to - scope.from) / 1000 / 60) / timeStep,
                    landStep = (diagramWindowWidth - 36) / stepsCount;

                scope.positions = [];
                for (var step = 0, i = 0, t = scope.from.valueOf(); step <= stepsCount; step++, i += (landStep), t += (timeStep * 60000)) {
                    var date = new Date(t);
                    scope.positions.push({
                        // todo придумать как добавлять месяцы, годы и дни
                        x: i + windowOffset,
                        label: ((date.getHours() < 10) ? '0' + date.getHours().toString() :  date.getHours().toString()) + ':' + ((date.getMinutes() < 10) ? '0' + date.getMinutes().toString() : date.getMinutes().toString())
                    });
                }

                scope.contentData = getContentData(
                        scope.data,
                        parseInt(diagramWindowWidth - 36) / ((scope.to - scope.from) / 1000),
                        scope.from
                    );
            },
            controller: function($scope, $element) {
                $scope.resizer = function(oldSize, newSize) {
                    var children = $element.children().map(function(index, elem) {
                        return $(elem);
                    }),
                    timeNet = children.filter(function(index, element) {
                        return element.attr('class') == 'timenet';
                    }),
                    rects = children.filter(function(index, element) {
                        return element.is('rect');
                    });

                    timeNet.each(function() {
                        // todo сюда пихать изменение положиеня временной сетки
                    });

                    var newDiagramWindowWidth = newSize - getLabelsWidths(scope.data)[0].val,
                        newScale = parseInt((newDiagramWindowWidth - 36)) / (($scope.to - $scope.from) / 1000);

                    var newContent = getContentData($scope.data, newScale, $scope.from);

                    rects.each(function() {
                        var exit = false,
                            i = 0;
                        while(!exit) {
                            if($(this).attr('id') == newContent[i].id) {
                                $(this).attr('x', newContent[i].x);
                                $(this).attr('width', newContent[i].width);
                                exit = true;
                            }
                        }
                    });
                }
            },
            template:
                '<svg width="" height="" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
                    '<text class="timenet" ng-repeat="position in positions" font-size="12px" font-family="Arial" fill="#000000" stroke="none" y="10" x="{{position.x}}"><tspan>{{position.label}}</tspan></text>' +
                    '<text class="timenet" ng-repeat="position in positions" font-size="12px" font-family="Arial" fill="#000000" stroke="none" y="114" x="{{position.x}}"><tspan>{{position.label}}</tspan></text>' +
                    '<text params-getter ng-repeat="label in contentData.labels" font-size="12px" font-family="Arial" fill="#000000" stroke="none" x="{{label.x}}" y="{{label.y}}"><tspan class="side_label">{{label.text}}</tspan></text>' +
                    '<rect ng-repeat="rect in contentData.rects" id="{{rect.id}}" x="{{rect.x}}" y="{{rect.y}}" width="{{rect.width}}" height="25" fill="{{rect.color}}">' +
                '</svg>',
            replace: true
        }
    });