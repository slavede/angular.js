'use strict';

describe('select', function() {
  var scope, formElement, element, $compile;

  function compile(html) {
    formElement = jqLite('<form name="form">' + html + '</form>');
    element = formElement.find('select');
    $compile(formElement)(scope);
    scope.$apply();
  }

  function unknownValue(value) {
    return '? ' + hashKey(value) + ' ?';
  }

  beforeEach(inject(function($rootScope, _$compile_) {
    scope = $rootScope.$new(); //create a child scope because the root scope can't be $destroy-ed
    $compile = _$compile_;
    formElement = element = null;
  }));


  afterEach(function() {
    scope.$destroy(); //disables unknown option work during destruction
    dealoc(formElement);
  });


  beforeEach(function() {
    this.addMatchers({
      toEqualSelect: function(expected) {
        var actualValues = [],
            expectedValues = [].slice.call(arguments);

        forEach(this.actual.find('option'), function(option) {
          actualValues.push(option.selected ? [option.value] : option.value);
        });

        this.message = function() {
          return 'Expected ' + toJson(actualValues) + ' to equal ' + toJson(expectedValues) + '.';
        };

        return equals(expectedValues, actualValues);
      },

      toEqualSelectWithOptions: function(expected) {
        var actualValues = {};
        var optionGroup;

        forEach(this.actual.find('option'), function(option) {
          optionGroup = option.parentNode.label || '';
          actualValues[optionGroup] = actualValues[optionGroup] || [];
          // IE9 doesn't populate the label property from the text property like other browsers
          actualValues[optionGroup].push(option.label || option.text);
        });

        this.message = function() {
          return 'Expected ' + toJson(actualValues) + ' to equal ' + toJson(expected) + '.';
        };

        return equals(expected, actualValues);
      }
    });

  });


  describe('select-one', function() {

    it('should compile children of a select without a ngModel, but not create a model for it',
        function() {
      compile('<select>' +
                '<option selected="true">{{a}}</option>' +
                '<option value="">{{b}}</option>' +
                '<option>C</option>' +
              '</select>');
      scope.$apply(function() {
        scope.a = 'foo';
        scope.b = 'bar';
      });

      expect(element.text()).toBe('foobarC');
    });


    it('should not interfere with selection via selected attr if ngModel directive is not present',
        function() {
      compile('<select>' +
                '<option>not me</option>' +
                '<option selected>me!</option>' +
                '<option>nah</option>' +
              '</select>');
      expect(element).toEqualSelect('not me', ['me!'], 'nah');
    });


    it('should require', function() {
      compile(
        '<select name="select" ng-model="selection" required ng-change="change()">' +
          '<option value=""></option>' +
          '<option value="c">C</option>' +
        '</select>');

      scope.change = function() {
        scope.log += 'change;';
      };

      scope.$apply(function() {
        scope.log = '';
        scope.selection = 'c';
      });

      expect(scope.form.select.$error.required).toBeFalsy();
      expect(element).toBeValid();
      expect(element).toBePristine();

      scope.$apply(function() {
        scope.selection = '';
      });

      expect(scope.form.select.$error.required).toBeTruthy();
      expect(element).toBeInvalid();
      expect(element).toBePristine();
      expect(scope.log).toEqual('');

      element[0].value = 'c';
      browserTrigger(element, 'change');
      expect(element).toBeValid();
      expect(element).toBeDirty();
      expect(scope.log).toEqual('change;');
    });


    it('should not be invalid if no require', function() {
      compile(
        '<select name="select" ng-model="selection">' +
          '<option value=""></option>' +
          '<option value="c">C</option>' +
        '</select>');

      expect(element).toBeValid();
      expect(element).toBePristine();
    });


    it('should work with repeated value options', function() {
      scope.robots = ['c3p0', 'r2d2'];
      scope.robot = 'r2d2';
      compile('<select ng-model="robot">' +
                '<option ng-repeat="r in robots">{{r}}</option>' +
              '</select>');
      expect(element).toEqualSelect('c3p0', ['r2d2']);

      browserTrigger(element.find('option').eq(0));
      expect(element).toEqualSelect(['c3p0'], 'r2d2');
      expect(scope.robot).toBe('c3p0');

      scope.$apply(function() {
        scope.robots.unshift('wallee');
      });
      expect(element).toEqualSelect('wallee', ['c3p0'], 'r2d2');
      expect(scope.robot).toBe('c3p0');

      scope.$apply(function() {
        scope.robots = ['c3p0+', 'r2d2+'];
        scope.robot = 'r2d2+';
      });
      expect(element).toEqualSelect('c3p0+', ['r2d2+']);
      expect(scope.robot).toBe('r2d2+');
    });


    it('should interpolate select names', function() {
      scope.robots = ['c3p0', 'r2d2'];
      scope.name = 'r2d2';
      scope.nameID = 47;
      compile('<select ng-model="name" name="name{{nameID}}">' +
                '<option ng-repeat="r in robots">{{r}}</option>' +
              '</select>');
      expect(scope.form.name47.$pristine).toBeTruthy();
      browserTrigger(element.find('option').eq(0));
      expect(scope.form.name47.$dirty).toBeTruthy();
      expect(scope.name).toBe('c3p0');
    });


    it('should rename select controls in form when interpolated name changes', function() {
      scope.nameID = "A";
      compile('<select ng-model="name" name="name{{nameID}}"></select>');
      expect(scope.form.nameA.$name).toBe('nameA');
      var oldModel = scope.form.nameA;
      scope.nameID = "B";
      scope.$digest();
      expect(scope.form.nameA).toBeUndefined();
      expect(scope.form.nameB).toBe(oldModel);
      expect(scope.form.nameB.$name).toBe('nameB');
    });


    describe('empty option', function() {

      it('should allow dynamic empty option', function() {
        scope.dynamicOptions = [];

        compile('<select ng-model="dynamicEmpty">' +
            '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">' +
              '{{opt.display}}' +
            '</option>' +
          '</selec>');

        expect(element.find('option').length).toBe(1, 'Initially there will be one empty option');
        expect(element.find('option').val()).toBe('? undefined:undefined ?', 'Initially there will be one empty option with value ?');

        // when dynamicOptions change and one of the elements is empty option self.emptyOption in directive should be defined
        scope.dynamicOptions = [
          {
            val: '',
            display: 'All Options'
          },
          {
            val: '1',
            display: 'First Option'
          }
        ];
        scope.dynamicEmpty = '';

        scope.$digest();

        expect(element.find('option').length).toBe(2, 'There should be two option now');

        expect(angular.element(element.find('option')[0]).val()).toBe('', 'First value should be empty');
        expect(angular.element(element.find('option')[0]).text()).toBe('All Options', 'First text should be "All Options"');
        expect(angular.element(element.find('option')[1]).val()).toBe('1', 'Second value should be empty');
        expect(angular.element(element.find('option')[1]).text()).toBe('First Option', 'Second text should be "First Option"');

      });

      it('should select the empty option when model is undefined', function() {
        compile('<select ng-model="robot">' +
                  '<option value="">--select--</option>' +
                  '<option value="x">robot x</option>' +
                  '<option value="y">robot y</option>' +
                '</select>');

        expect(element).toEqualSelect([''], 'x', 'y');
      });


      it('should support defining an empty option anywhere in the option list', function() {
        compile('<select ng-model="robot">' +
                  '<option value="x">robot x</option>' +
                  '<option value="">--select--</option>' +
                  '<option value="y">robot y</option>' +
                '</select>');

        expect(element).toEqualSelect('x', [''], 'y');
      });


      it('should set the model to empty string when empty option is selected', function() {
        scope.robot = 'x';
        compile('<select ng-model="robot">' +
                  '<option value="">--select--</option>' +
                  '<option value="x">robot x</option>' +
                  '<option value="y">robot y</option>' +
                '</select>');
        expect(element).toEqualSelect('', ['x'], 'y');

        browserTrigger(element.find('option').eq(0));
        expect(element).toEqualSelect([''], 'x', 'y');
        expect(scope.robot).toBe('');
      });


      it('should remove unknown option when model is undefined', function() {
        scope.robot = 'other';
        compile('<select ng-model="robot">' +
                  '<option value="">--select--</option>' +
                  '<option value="x">robot x</option>' +
                  '<option value="y">robot y</option>' +
                '</select>');

        expect(element).toEqualSelect([unknownValue('other')], '', 'x', 'y');

        scope.robot = undefined;
        scope.$digest();

        expect(element).toEqualSelect([''], 'x', 'y');
      });


      describe('interactions with repeated options', function() {

        it('should select empty option when model is undefined', function() {
          scope.robots = ['c3p0', 'r2d2'];
          compile('<select ng-model="robot">' +
                    '<option value="">--select--</option>' +
                    '<option ng-repeat="r in robots">{{r}}</option>' +
                  '</select>');
          expect(element).toEqualSelect([''], 'c3p0', 'r2d2');
        });


        it('should set model to empty string when selected', function() {
          scope.robots = ['c3p0', 'r2d2'];
          compile('<select ng-model="robot">' +
                    '<option value="">--select--</option>' +
                    '<option ng-repeat="r in robots">{{r}}</option>' +
                  '</select>');

          browserTrigger(element.find('option').eq(1));
          expect(element).toEqualSelect('', ['c3p0'], 'r2d2');
          expect(scope.robot).toBe('c3p0');

          browserTrigger(element.find('option').eq(0));
          expect(element).toEqualSelect([''], 'c3p0', 'r2d2');
          expect(scope.robot).toBe('');
        });


        it('should not break if both the select and repeater models change at once', function() {
          scope.robots = ['c3p0', 'r2d2'];
          scope.robot = 'c3p0';
          compile('<select ng-model="robot">' +
                    '<option value="">--select--</option>' +
                    '<option ng-repeat="r in robots">{{r}}</option>' +
                  '</select>');
          expect(element).toEqualSelect('', ['c3p0'], 'r2d2');

          scope.$apply(function() {
            scope.robots = ['wallee'];
            scope.robot = '';
          });

          expect(element).toEqualSelect([''], 'wallee');
        });
      });
    });


    describe('unknown option', function() {

      it("should insert&select temporary unknown option when no options-model match", function() {
        compile('<select ng-model="robot">' +
                  '<option>c3p0</option>' +
                  '<option>r2d2</option>' +
                '</select>');

        expect(element).toEqualSelect([unknownValue(undefined)], 'c3p0', 'r2d2');

        scope.$apply(function() {
          scope.robot = 'r2d2';
        });
        expect(element).toEqualSelect('c3p0', ['r2d2']);


        scope.$apply(function() {
          scope.robot = "wallee";
        });
        expect(element).toEqualSelect([unknownValue('wallee')], 'c3p0', 'r2d2');
      });


      it("should NOT insert temporary unknown option when model is undefined and empty options " +
          "is present", function() {
        compile('<select ng-model="robot">' +
                  '<option value="">--select--</option>' +
                  '<option>c3p0</option>' +
                  '<option>r2d2</option>' +
                '</select>');

        expect(element).toEqualSelect([''], 'c3p0', 'r2d2');
        expect(scope.robot).toBeUndefined();

        scope.$apply(function() {
          scope.robot = null;
        });
        expect(element).toEqualSelect([unknownValue(null)], '', 'c3p0', 'r2d2');

        scope.$apply(function() {
          scope.robot = 'r2d2';
        });
        expect(element).toEqualSelect('', 'c3p0', ['r2d2']);

        scope.$apply(function() {
          delete scope.robot;
        });
        expect(element).toEqualSelect([''], 'c3p0', 'r2d2');
      });


      it("should insert&select temporary unknown option when no options-model match, empty " +
          "option is present and model is defined", function() {
        scope.robot = 'wallee';
        compile('<select ng-model="robot">' +
                  '<option value="">--select--</option>' +
                  '<option>c3p0</option>' +
                  '<option>r2d2</option>' +
                '</select>');

        expect(element).toEqualSelect([unknownValue('wallee')], '', 'c3p0', 'r2d2');

        scope.$apply(function() {
          scope.robot = 'r2d2';
        });
        expect(element).toEqualSelect('', 'c3p0', ['r2d2']);
      });


      describe('interactions with repeated options', function() {

        it('should work with repeated options', function() {
          compile('<select ng-model="robot">' +
                    '<option ng-repeat="r in robots">{{r}}</option>' +
                  '</select>');
          expect(element).toEqualSelect([unknownValue(undefined)]);
          expect(scope.robot).toBeUndefined();

          scope.$apply(function() {
            scope.robot = 'r2d2';
          });
          expect(element).toEqualSelect([unknownValue('r2d2')]);
          expect(scope.robot).toBe('r2d2');

          scope.$apply(function() {
            scope.robots = ['c3p0', 'r2d2'];
          });
          expect(element).toEqualSelect('c3p0', ['r2d2']);
          expect(scope.robot).toBe('r2d2');
        });


        it('should work with empty option and repeated options', function() {
          compile('<select ng-model="robot">' +
                    '<option value="">--select--</option>' +
                    '<option ng-repeat="r in robots">{{r}}</option>' +
                  '</select>');
          expect(element).toEqualSelect(['']);
          expect(scope.robot).toBeUndefined();

          scope.$apply(function() {
            scope.robot = 'r2d2';
          });
          expect(element).toEqualSelect([unknownValue('r2d2')], '');
          expect(scope.robot).toBe('r2d2');

          scope.$apply(function() {
            scope.robots = ['c3p0', 'r2d2'];
          });
          expect(element).toEqualSelect('', 'c3p0', ['r2d2']);
          expect(scope.robot).toBe('r2d2');
        });


        it('should insert unknown element when repeater shrinks and selected option is unavailable',
            function() {
          scope.robots = ['c3p0', 'r2d2'];
          scope.robot = 'r2d2';
          compile('<select ng-model="robot">' +
                    '<option ng-repeat="r in robots">{{r}}</option>' +
                  '</select>');
          expect(element).toEqualSelect('c3p0', ['r2d2']);
          expect(scope.robot).toBe('r2d2');

          scope.$apply(function() {
            scope.robots.pop();
          });
          expect(element).toEqualSelect([unknownValue('r2d2')], 'c3p0');
          expect(scope.robot).toBe('r2d2');

          scope.$apply(function() {
            scope.robots.unshift('r2d2');
          });
          expect(element).toEqualSelect(['r2d2'], 'c3p0');
          expect(scope.robot).toBe('r2d2');

          scope.$apply(function() {
            delete scope.robots;
          });
          expect(element).toEqualSelect([unknownValue('r2d2')]);
          expect(scope.robot).toBe('r2d2');
        });
      });

    });

  });


  describe('selectController.hasOption', function() {

    function compileRepeatedOptions() {
      compile('<select ng-model="robot">' +
                '<option value="{{item.value}}" ng-repeat="item in robots">{{item.label}}</option>' +
              '</select>');
    }

    function compileGroupedOptions() {
      compile(
        '<select ng-model="mySelect">' +
          '<option ng-repeat="item in values">{{item.name}}</option>' +
          '<optgroup ng-repeat="group in groups" label="{{group.name}}">' +
            '<option ng-repeat="item in group.values">{{item.name}}</option>' +
          '</optgroup>' +
        '</select>');
    }

    describe('flat options', function() {
      it('should return false for options shifted via ngRepeat', function() {
        scope.robots = [
          {value: 1, label: 'c3p0'},
          {value: 2, label: 'r2d2'}
        ];

        compileRepeatedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.robots.shift();
        });

        expect(selectCtrl.hasOption('1')).toBe(false);
        expect(selectCtrl.hasOption('2')).toBe(true);
      });


      it('should return false for options popped via ngRepeat', function() {
        scope.robots = [
          {value: 1, label: 'c3p0'},
          {value: 2, label: 'r2d2'}
        ];

        compileRepeatedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.robots.pop();
        });

        expect(selectCtrl.hasOption('1')).toBe(true);
        expect(selectCtrl.hasOption('2')).toBe(false);
      });


      it('should return true for options added via ngRepeat', function() {
        scope.robots = [
          {value: 2, label: 'r2d2'}
        ];

        compileRepeatedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.robots.unshift({value: 1, label: 'c3p0'});
        });

        expect(selectCtrl.hasOption('1')).toBe(true);
        expect(selectCtrl.hasOption('2')).toBe(true);
      });


      it('should keep all the options when changing the model', function() {

        compile('<select ng-model="mySelect"><option ng-repeat="o in [\'A\',\'B\',\'C\']">{{o}}</option></select>');

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.mySelect = 'C';
        });

        expect(selectCtrl.hasOption('A')).toBe(true);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(true);
        expect(element).toEqualSelectWithOptions({'': ['A', 'B', 'C']});
      });
    });


    describe('grouped options', function() {

      it('should be able to detect when elements move from a previous group', function() {
        scope.values = [{name: 'A'}];
        scope.groups = [
          {
            name: 'first',
            values: [
              {name: 'B'},
              {name: 'C'},
              {name: 'D'}
            ]
          },
          {
            name: 'second',
            values: [
              {name: 'E'}
            ]
          }
        ];

        compileGroupedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          var itemD = scope.groups[0].values.pop();
          scope.groups[1].values.unshift(itemD);
          scope.values.shift();
        });

        expect(selectCtrl.hasOption('A')).toBe(false);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(true);
        expect(selectCtrl.hasOption('D')).toBe(true);
        expect(selectCtrl.hasOption('E')).toBe(true);
        expect(element).toEqualSelectWithOptions({'': [''], 'first':['B', 'C'], 'second': ['D', 'E']});
      });


      it('should be able to detect when elements move from a following group', function() {
        scope.values = [{name: 'A'}];
        scope.groups = [
          {
            name: 'first',
            values: [
              {name: 'B'},
              {name: 'C'}
            ]
          },
          {
            name: 'second',
            values: [
              {name: 'D'},
              {name: 'E'}
            ]
          }
        ];

        compileGroupedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          var itemD = scope.groups[1].values.shift();
          scope.groups[0].values.push(itemD);
          scope.values.shift();
        });
        expect(selectCtrl.hasOption('A')).toBe(false);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(true);
        expect(selectCtrl.hasOption('D')).toBe(true);
        expect(selectCtrl.hasOption('E')).toBe(true);
        expect(element).toEqualSelectWithOptions({'': [''], 'first':['B', 'C', 'D'], 'second': ['E']});
      });


      it('should be able to detect when an element is replaced with an element from a previous group', function() {
        scope.values = [{name: 'A'}];
        scope.groups = [
          {
            name: 'first',
            values: [
              {name: 'B'},
              {name: 'C'},
              {name: 'D'}
            ]
          },
          {
            name: 'second',
            values: [
              {name: 'E'},
              {name: 'F'}
            ]
          }
        ];

        compileGroupedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          var itemD = scope.groups[0].values.pop();
          scope.groups[1].values.unshift(itemD);
          scope.groups[1].values.pop();
        });
        expect(selectCtrl.hasOption('A')).toBe(true);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(true);
        expect(selectCtrl.hasOption('D')).toBe(true);
        expect(selectCtrl.hasOption('E')).toBe(true);
        expect(selectCtrl.hasOption('F')).toBe(false);
        expect(element).toEqualSelectWithOptions({'': ['', 'A'], 'first':['B', 'C'], 'second': ['D', 'E']});
      });


      it('should be able to detect when element is replaced with an element from a following group', function() {
        scope.values = [{name: 'A'}];
        scope.groups = [
          {
            name: 'first',
            values: [
              {name: 'B'},
              {name: 'C'}
            ]
          },
          {
            name: 'second',
            values: [
              {name: 'D'},
              {name: 'E'}
            ]
          }
        ];

        compileGroupedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.groups[0].values.pop();
          var itemD = scope.groups[1].values.shift();
          scope.groups[0].values.push(itemD);
        });
        expect(selectCtrl.hasOption('A')).toBe(true);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(false);
        expect(selectCtrl.hasOption('D')).toBe(true);
        expect(selectCtrl.hasOption('E')).toBe(true);
        expect(element).toEqualSelectWithOptions({'': ['', 'A'], 'first':['B', 'D'], 'second': ['E']});
      });


      it('should be able to detect when an element is removed', function() {
        scope.values = [{name: 'A'}];
        scope.groups = [
          {
            name: 'first',
            values: [
              {name: 'B'},
              {name: 'C'}
            ]
          },
          {
            name: 'second',
            values: [
              {name: 'D'},
              {name: 'E'}
            ]
          }
        ];

        compileGroupedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.groups[1].values.shift();
        });
        expect(selectCtrl.hasOption('A')).toBe(true);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(true);
        expect(selectCtrl.hasOption('D')).toBe(false);
        expect(selectCtrl.hasOption('E')).toBe(true);
        expect(element).toEqualSelectWithOptions({'': ['', 'A'], 'first':['B', 'C'], 'second': ['E']});
      });


      it('should be able to detect when a group is removed', function() {
        scope.values = [{name: 'A'}];
        scope.groups = [
          {
            name: 'first',
            values: [
              {name: 'B'},
              {name: 'C'}
            ]
          },
          {
            name: 'second',
            values: [
              {name: 'D'},
              {name: 'E'}
            ]
          }
        ];

        compileGroupedOptions();

        var selectCtrl = element.controller('select');

        scope.$apply(function() {
          scope.groups.pop();
        });
        expect(selectCtrl.hasOption('A')).toBe(true);
        expect(selectCtrl.hasOption('B')).toBe(true);
        expect(selectCtrl.hasOption('C')).toBe(true);
        expect(selectCtrl.hasOption('D')).toBe(false);
        expect(selectCtrl.hasOption('E')).toBe(false);
        expect(element).toEqualSelectWithOptions({'': ['', 'A'], 'first':['B', 'C']});
      });
    });
  });

  describe('select-multiple', function() {

    it('should support type="select-multiple"', function() {
      compile(
        '<select ng-model="selection" multiple>' +
          '<option>A</option>' +
          '<option>B</option>' +
        '</select>');

      scope.$apply(function() {
        scope.selection = ['A'];
      });

      expect(element).toEqualSelect(['A'], 'B');

      scope.$apply(function() {
        scope.selection.push('B');
      });

      expect(element).toEqualSelect(['A'], ['B']);
    });

    it('should work with optgroups', function() {
      compile('<select ng-model="selection" multiple>' +
                '<optgroup label="group1">' +
                  '<option>A</option>' +
                  '<option>B</option>' +
                '</optgroup>' +
              '</select>');

      expect(element).toEqualSelect('A', 'B');
      expect(scope.selection).toBeUndefined();

      scope.$apply(function() {
        scope.selection = ['A'];
      });
      expect(element).toEqualSelect(['A'], 'B');

      scope.$apply(function() {
        scope.selection.push('B');
      });
      expect(element).toEqualSelect(['A'], ['B']);
    });

    it('should require', function() {
      compile(
        '<select name="select" ng-model="selection" multiple required>' +
          '<option>A</option>' +
          '<option>B</option>' +
        '</select>');

      scope.$apply(function() {
        scope.selection = [];
      });

      expect(scope.form.select.$error.required).toBeTruthy();
      expect(element).toBeInvalid();
      expect(element).toBePristine();

      scope.$apply(function() {
        scope.selection = ['A'];
      });

      expect(element).toBeValid();
      expect(element).toBePristine();

      element[0].value = 'B';
      browserTrigger(element, 'change');
      expect(element).toBeValid();
      expect(element).toBeDirty();
    });


    describe('calls to $render', function() {

      var ngModelCtrl;

      beforeEach(function() {
        compile(
          '<select name="select" ng-model="selection" multiple>' +
          '<option>A</option>' +
          '<option>B</option>' +
          '</select>');

        ngModelCtrl = element.controller('ngModel');
        spyOn(ngModelCtrl, '$render').andCallThrough();
      });


      it('should call $render once when the reference to the viewValue changes', function() {
        scope.$apply(function() {
          scope.selection = ['A'];
        });
        expect(ngModelCtrl.$render.calls.length).toBe(1);

        scope.$apply(function() {
          scope.selection = ['A', 'B'];
        });
        expect(ngModelCtrl.$render.calls.length).toBe(2);

        scope.$apply(function() {
          scope.selection = [];
        });
        expect(ngModelCtrl.$render.calls.length).toBe(3);
      });


      it('should call $render once when the viewValue deep-changes', function() {
        scope.$apply(function() {
          scope.selection = ['A'];
        });
        expect(ngModelCtrl.$render.calls.length).toBe(1);

        scope.$apply(function() {
          scope.selection.push('B');
        });
        expect(ngModelCtrl.$render.calls.length).toBe(2);

        scope.$apply(function() {
          scope.selection.length = 0;
        });
        expect(ngModelCtrl.$render.calls.length).toBe(3);
      });

    });

  });


  describe('option', function() {

    it('should populate value attribute on OPTION', function() {
      compile('<select ng-model="x"><option selected>abc</option></select>');
      expect(element).toEqualSelect([unknownValue(undefined)], 'abc');
    });

    it('should ignore value if already exists', function() {
      compile('<select ng-model="x"><option value="abc">xyz</option></select>');
      expect(element).toEqualSelect([unknownValue(undefined)], 'abc');
    });

    it('should set value even if self closing HTML', function() {
      scope.x = 'hello';
      compile('<select ng-model="x"><option>hello</select>');
      expect(element).toEqualSelect(['hello']);
    });

    it('should not blow up when option directive is found inside of a datalist',
        inject(function($compile, $rootScope) {
      var element = $compile('<div>' +
                               '<datalist><option>some val</option></datalist>' +
                               '<span>{{foo}}</span>' +
                             '</div>')($rootScope);

      $rootScope.foo = 'success';
      $rootScope.$digest();
      expect(element.find('span').text()).toBe('success');
      dealoc(element);
    }));

    it('should throw an exception if an option value interpolates to "hasOwnProperty"', function() {
      scope.hasOwnPropertyOption = "hasOwnProperty";
      expect(function() {
        compile('<select ng-model="x">' +
                  '<option>{{hasOwnPropertyOption}}</option>' +
                '</select>');
      }).toThrowMinErr('ng','badname', 'hasOwnProperty is not a valid "option value" name');
    });

  });
});
