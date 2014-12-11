
requirejs.config({
    baseUrl: '',

    paths: {
        'jquery': 'lib/jquery.min',
        'underscore': 'lib/underscore.min',
        'underscore-string': 'lib/underscore.string.min',
        'rangy': 'lib/rangy-core',
        'interact': 'lib/interact-1.1.3.min',
        'semantic': 'lib/semantic',
        'sidebar': 'lib/sidebar',

        'parser': 'src/parser',
        'engine': 'src/engine',
        'view': 'src/view',
        'nlp': 'src/nlp',
    },

    shim: {
        'underscore': {
            exports: '_'
        },
        'underscore-string': {
            deps: ['underscore'],
            exports: '_'
        },
        'semantic': {
            deps: ['jquery'],
        },
        'sidebar': {
            deps: ['jquery', 'semantic'],
        },

        'interact': {
            exports: 'interact',
        },
        'rangy': {
            exports: 'rangy',
        },
    },
});


require([
    'jquery',
    'underscore',
    'parser',
    'engine',
    'view',
    'nlp',
    'underscore-string',
    'sidebar'
], function ($, _, Parser, Engine, View, nlp) {
    var parser = new Parser(),
        view = new View({$el: $('#app-object-list')}),
        engine = new Engine(),
        conceptId = 0,
        concepts = {},
        conceptsContext = {
            'date': [],
            'emailAddress': [],
            'telephoneNumber': [],
            'address': [],
            'item': [],
        };


    $(function () {
        $('#app-show-scenarios').on('click', function () {
            $('#app-scenarios-links').sidebar('toggle');
        });
    });


    var typeToColor = {
        date: 'yellow',
        address: 'green',
        emailAddress: 'blue',
        telephoneNumber: 'red',
        item: 'orange',
    };


    var renderToken = _.template(
        '<div class="ui label <%= color %> noselect app-semantic-token"' +
        '     draggable="true" ' +
        '     data-isRoot="<%= isRoot %>"' +
        '     data-conceptid="<%= conceptId %>">' +
        '    <%= text %>' +
        '</div>');


    var render = function (context) {
        return $(renderToken(context))[0];
    };


    var replaceSelectedText = function () {
        var selection,
            text,
            type,
            range;

        if (window.getSelection) {
            selection = window.getSelection();
            if (selection.rangeCount) {
                range = selection.getRangeAt(0);
                text = range.toString();
                type = nlp.inferType(text);


                if (text.length > 0) {
                    // add concept
                    conceptId += 1;
                    concepts[conceptId] = {type: type};
                    conceptsContext[type].push(renderToken({
                        text: text,
                        color: typeToColor[type],
                        conceptId: conceptId,
                        isRoot: false,
                    }));

                    updateObject();

                    range.deleteContents();
                    range.insertNode(render({
                        text: text,
                        color: typeToColor[type],
                        conceptId: conceptId,
                        isRoot: true,
                    }));
                }
            }
        }
    };


    $('#app-raw-text').on('mouseup', function () {
        replaceSelectedText();
    });

    var clearSelection = function ($el) {
        $el.replaceWith(_.str.strip($el.text()));
    };


    /*
     * Object view
     */
    var updateObject = function () {
        var $el = $('#app-object-list'),
            entities = engine.inferEntityType(_.values(concepts)),
            context = {};

        _.each(_.pairs(conceptsContext), function (pair) {
            var conceptType = pair[0],
                conceptsArray = pair[1];

            if (conceptType === 'item') {
                context[conceptType] = conceptsArray;
            } else {
                if (conceptsArray.length > 0) {
                    context[conceptType] = conceptsArray[0];
                }
            }
        });

        _.each(entities, function (entity) {
            // view.clear();
            view.render(entity, context);
        });
    };

    $('body').on('dblclick', '.app-semantic-token', function (event) {
        event.preventDefault();

        var $this = $(this);

        delete concepts[$this.data('conceptid')];
        clearSelection($this);

        updateObject();
    });


    /*
     * Drag & Drop part
     */
    var $dragged;

    $('body').on('drag', '.app-semantic-token', function (event) {
        $dragged = $(this);
    });


    $('body').on('dragover', '.app-drop-zone', function (event) {
        event.preventDefault();
    }).on('drop', '.app-drop-zone', function (event) {
        event.preventDefault();

        var text = $dragged.text();

        if ($dragged.data('isRoot')) {
            $(this).append($dragged.clone());
        } else {
            $(this).append($dragged);
        }
    });


    /*
     * Commands
     */
    var ENTER = 13;

    $('#app-command-bar').on('keydown', function (event) {
        var $this = $(this),
            data;

        if (event.which == ENTER) {
            data = parser.parse($this.val());

            view.render(data.object, data.extra);
        }
    });


 //    $('body').on('focusout', '[contenteditable]', function(e){
 // console.log('test');
 //    });

    // $('.header').focusout(function(e) {
    //     console.log('focusout');
    // });
    /* -------------------------------------------------------- */
    /*                       SCENARIOS                          */
    /* -------------------------------------------------------- */

    /*
     * Scenario: CI Variables through AI
     * Automatic inference of entities
     */
    var entities = {
        'date': ['this Friday at 8 pm'],
        'emailAddress': ['janet.smith@edu.world'],
        'address': ['5 Johnson Court, Amazing Avenue', 'High Street 8'],
        'telephoneNumber': ['07999911111'],
    }

    $('#app-scenario-2').on('click', function () {

        var $this = $('#app-raw-text'),
            replace = function (type) {
                entities[type].forEach(function (text) {
                    // add concept
                    conceptId += 1;
                    concepts[conceptId] = {type: type};
                    conceptsContext[type].push(renderToken({
                        text: text,
                        color: typeToColor[type],
                        conceptId: conceptId,
                        isRoot: false,
                    }));

                    $this.html($this.html().replace(text, renderToken({
                        color: typeToColor[type],
                        text: text,
                        conceptId: conceptId,
                        isRoot: true,
                    })))

                    if ($this.find(
                        '[data-conceptid="' + conceptId + '"]').length > 0) {

                        updateObject();
                    }
                });
            };


        $('#app-find-date').on('click', function () {
            replace('date');
        });


        $('#app-find-address').on('click', function () {
            replace('address');

        });

        $('#app-find-emailAddress').on('click', function () {
            replace('emailAddress');
        });

        $('#app-find-telephoneNumber').on('click', function () {
            replace('telephoneNumber');
        });


        $('#app-ai-entity-finder').removeClass('hidden');
    });


    /*
     * Scenario: CI Variables through AI and HI
     * Automatic inference of entities
     */
    $('#app-scenario-3').on('click', function () {
        $('#app-scenario-2').trigger('click');
    });


    /*
     * Scenario: Queries
     */
    $('#app-scenario-4').on('click', function () {
        $('#app-scenario-3').trigger('click');

        // $('#app-query-input').removeClass('hidden');
        $('#app-query-output').removeClass('hidden');
    });


});
