// Query Build, a jQuery plugin for making a JSON filter input
//
// Version 0.0.2
// Full source at https://github.com/mjpa/query-build
// Copyright (c) 2014 Mike Anchor
// Released under MIT License

(function($) {
  // Name prefix for classes / data attributes
  var namespace = 'query-build-';

  function QueryBuild(target, options) {
    var instance = this;

    // Options
    instance._options = $.extend({
      auto_submit: false
    }, options);

    // The facets / filter
    instance._facets = {};
    instance._filter = {};

    // Loop through the form elements and build up the facet / filters
    target.find('input[type="text"], select, textarea').each(function(idx, element) {
      // Extract info about the input
      var $element = $(element);
      var key = $element.attr('name');
      var val = $element.val();
      var label = $element.attr('placeholder') || $element.attr('title');

      // Add the facet and if there is a value, add it to the filter
      instance._facets[key] = label;
      if (val != '') {
        instance._filter[key] = val;
      }

      // Hide the element now
      $element.css({ display: 'none' });
    });

    // Save the form target
    instance._target = target;

    // No current facet
    instance._current_facet = null;

    // Container element
    instance._container = $('<div></div>')
                        .data(namespace + 'instance', instance)
                        .addClass(namespace + 'container')
                        .click(instance.openFacetSelect)
                        .appendTo(target);

    // Add the "Click to add filter..." text
    instance._help_text = $('<span></span>')
                        .text('Click to add filter...')
                        .addClass('muted')
                        .addClass(namespace + 'help-text')

    // Element for holding the applied filters and initialise
    instance._applied_filters_container = $('<ol></ol>')
                                        .addClass(namespace + 'applied-filters')
                                        .appendTo(instance._container);
    instance.updateFilter();

    // Facets selector and initialise the list items
    instance._facet_select = $('<ul></ul>')
                           .addClass(namespace + 'facet-select')
                           .addClass('dropdown-menu')
                           .appendTo(instance._container);
    instance.updateFacetSelect();

    // Add the help text last
    instance._help_text.appendTo(instance._container);

    // Window click , or "Escape" should close the facet select
    $(window).bind('click keyup', instance.closeUp);
  }

  QueryBuild.prototype.closeUp = function(event) {
    if (event.keyCode && event.keyCode != 27) {
      return;
    }

    $('.' + namespace + 'facet-select-active').removeClass('.' + namespace + 'facet-select-active');
  }

  QueryBuild.prototype.openFacetSelect = function(event) {
    var instance = $(this).data(namespace + 'instance');

    // Ensure the click was on the container (or help text)
    if (event.target != instance._container[0] && event.target != instance._help_text[0]) {
      return false;
    }

    // Do we have no facets to select?
    if (instance._facet_select.find('> li').length == 0) {
      return false;
    }

    // Work out the width of applied filters
    var applied_filters_width = -1
      + parseInt(instance._container.css('paddingLeft').replace(/px$/, ''))
      + parseInt(instance._applied_filters_container.css('paddingLeft').replace(/px$/, ''))
      + parseInt(instance._applied_filters_container.css('paddingRight').replace(/px$/, ''))
      + instance._applied_filters_container.width();

    // Border radius?
    var container_border_radius = parseInt(instance._container.css('borderBottomLeftRadius').replace(/px$/, ''));

    // Position and show the facet selector
    instance._facet_select.css({ left: Math.max(container_border_radius, applied_filters_width) + 'px' });
    instance._facet_select.addClass(namespace + 'facet-select-active');

    // Stop propagation
    return false;
  }

  QueryBuild.prototype.updateFacetSelect = function() {
    // Clear current list items
    this._facet_select.html('');

    // Add a "menu item" for each item
    var instance = this;
    $.each(this._facets, function (key, label) {
      // If there is a filter for this facet, don't add it
      if (typeof(instance._filter[key]) != 'undefined') {
        return;
      }

      // The link element containing the label
      var $link = $('<a></a>')
                    .text(label)
                    .attr('href', '#')
                    .data(namespace + 'facet-key', key)
                    .data(namespace + 'instance', instance)
                    .click(instance.facetKeyClick);

      // Add to the list
      $('<li></li>')
        .appendTo(instance._facet_select)
        .append($link);
    });

    // Show / hide the help text based on if we added any facets
    if (this._facet_select.find('> li').length > 0) {
      this._help_text.css('display', '');
    }
    else {
      this._help_text.css('display', 'none');
    }
  }

  QueryBuild.prototype.facetKeyClick = function(event) {
    var instance = $(this).data(namespace + 'instance');
    var facet_key = $(this).data(namespace + 'facet-key');

    // Set the current facet and re-render the filter, and hide the facet select
    instance._current_facet = facet_key;
    instance.updateFilter();
    instance._facet_select.removeClass(namespace + 'facet-select-active');

    return false;
  }

  QueryBuild.prototype.updateFilter = function() {
    var instance = this;

    // Clear the element first
    instance._applied_filters_container.html('');

    // Separate object so we can add the current facet
    var items = this._filter;
    if (instance._current_facet != null) {
      items[instance._current_facet] = null;
    }

    // Add an item for each filter
    $.each(items, function(key, value) {
      // Is the original input a select? If so, use the label not the value
      if (value != null) {
        var $option = instance._target.find('select[name="' + key + '"] option[value="' + value + '"]');
        if ($option.length > 0) {
          value = $option.text();
        }
      }

      // A span each for the label
      var $key = $('<span></span>')
                   .addClass(namespace + 'applied-filter-name')
                   .text(instance._facets[key]);

      // A span for the value
      var $value = $('<span></span>')
                     .addClass(namespace + 'applied-filter-value')
                     .bind('input propertychange', instance.filterValueChange)
                     .click(instance.focusFilterValue)
                     .data(namespace + 'instance', instance)
                     .data(namespace + 'key', key == instance._current_facet ? null : key)
                     .blur(instance.setFilter)
                     .keydown(instance.filterValueKeyDown)
                     .focus(instance.filterValueFocus)
                     .text(value == null ? '' : value);

      // A span to remove the filter - only with a value
      if (value != null) {
        var $remove = $('<span></span>')
                        .addClass(namespace + 'applied-filter-remove')
                        .text('✖')
                        .data(namespace + 'instance', instance)
                        .data(namespace + 'key', key)
                        .click(instance.removeFilter);
      }

      // Add the item to the container
      var $li = $('<li></li>')
                  .append($key)
                  .append($value);

      // Remove needed?
      if (typeof($remove) != 'undefined') {
        $li.append($remove);
      }

      // Add list item to the container
      $li.appendTo(instance._applied_filters_container);

      // If the key is the current facet, focus the value
      if (key == instance._current_facet) {
        $value.trigger('click');
      }
    });
  }

  QueryBuild.prototype.filterValueKeyDown = function(event) {
    var $input = $(this);
    var $select_dropdown = $input.data(namespace + 'filter-value-dropdown');

    switch (event.which) {
      // Enter key
      case 13:
        $input.trigger('blur');
        break;

      // Up and down arrows
      case 38:
        var dir = 'prev';
        var loop = 'last';
      case 40:
        var dir = dir || 'next';
        var loop = loop || 'first';

        var $next_option = $select_dropdown.find('a.' + namespace + 'filter-value-options-active').parent()[dir](':visible').find('a');
        if ($next_option.length == 0) {
          $next_option = $select_dropdown.find('li:visible')[loop]().find('a');
        }

        $select_dropdown.find('a.' + namespace + 'filter-value-options-active').removeClass(namespace + 'filter-value-options-active');
        $next_option.addClass(namespace + 'filter-value-options-active');
        break;
    }
  }

  QueryBuild.prototype.focusFilterValue = function() {
    if ($(this).is(':focus')) {
      return;
    }

    $(this).attr('contenteditable', 'true').focus();
  }

  QueryBuild.prototype.filterValueChange = function() {
    var instance = $(this).data(namespace + 'instance');
    var key = $(this).data(namespace + 'key') || instance._current_facet;

    // If the filter value isn't a key, nothing to do here...
    if (instance._target.find('select[name="' + key + '"]').length == 0) {
      return;
    }

    var search = $(this).text().toLowerCase();
    var $dropdown = $(this).data(namespace + 'filter-value-dropdown');

    // Remove the dropdown active item class
    $dropdown
      .find('.' + namespace + 'filter-value-options-active')
      .removeClass(namespace + 'filter-value-options-active');

    // Filter the dropdown
    var selected_match = false;
    $dropdown.find('li > a').each(function() {
      var text = $(this).text().toLowerCase();

      if (text.indexOf(search) === -1) {
        $(this).parent().css({ display: 'none' });
      }
      else {
        $(this).parent().css('display', '');

        if (!selected_match) {
          $(this).addClass(namespace + 'filter-value-options-active');
          selected_match = true;
        }
      }
    });
  }

  QueryBuild.prototype.setFilter = function() {
    var instance = $(this).data(namespace + 'instance');
    var key = $(this).data(namespace + 'key') || instance._current_facet;
    var value = $(this).text();

    // Disable content editable
    $(this).attr('contenteditable', 'false');

    // If a filter value dropdown option has gained focus, don't do a thing!
    if (instance._container.find('.query-build-filter-value-options:active').length || instance._container.find('.query-build-filter-value-options :active').length) {
      return false;
    }

    // Now we know the blur isn't because an options value was selected, remove it
    var $dropdown = $(this).data(namespace + 'filter-value-dropdown');
    if ($dropdown) {
      // If we're in here, the filter has lost focus and they didn't select a pre-defined option so lets pick the first visible option.
      var $option = $dropdown.find('li > a.' + namespace + 'filter-value-options-active');

      // No visible options? Set the value to blank
      if ($option.length == 0) {
        value = '';
      }
      else {
        value = $option.data(namespace + 'filter-value-value');
      }

      // We can remove the dropdown now
      $dropdown.remove();
    }

    // If the value is empty, clear it instead
    if (value == '') {
      if (typeof(instance._filter[key]) != 'undefined') {
        delete instance._filter[key];
      }
    }
    else {
      instance._filter[key] = value;
    }

    // Clear the current facet either way
    instance._current_facet = null;

    // Filter changed so update!
    instance.update();
  }

  QueryBuild.prototype.updateFilterTarget = function() {
    var instance = this;

    // Update the target values
    $.each(instance._facets, function(key, label) {
      var $input = instance._target.find('input[name="' + key + '"], select[name="' + key + '"], textarea[name="' + key + '"]');

      // If the facet has a filter value set it, otherwise set blank
      if (typeof(instance._filter[key]) == 'undefined') {
        $input.val('');
      }
      else {
        $input.val(instance._filter[key]);
      }
    });

    // Submit the form if set to do so
    if (instance._options.auto_submit) {
      instance._target.submit();

      // Return true to stop
      return true;
    }
  }

  QueryBuild.prototype.removeFilter = function() {
    var instance = $(this).data(namespace + 'instance');
    var key = $(this).data(namespace + 'key');

    if (typeof(instance._filter[key]) != 'undefined') {
      delete instance._filter[key];
      instance.update();
    }

    return false;
  }

  QueryBuild.prototype.update = function() {
    // Update the filter target
    if (this.updateFilterTarget()) {
      return;
    }

    // Need to update both the filter and the facet selector
    this.updateFacetSelect();
    this.updateFilter();
  }

  QueryBuild.prototype.filterValueFocus = function() {
    var $input = $(this);
    var instance = $(this).data(namespace + 'instance');
    var key = $(this).data(namespace + 'key') || instance._current_facet;

    // Is the input for this filter value a <select>?
    var $select = instance._target.find('select[name="' + key + '"]');
    if ($select.length > 0) {
      var input_offset = $input.offset();
      var $select_dropdown = $('<ul></ul>')
                               .addClass(namespace + 'filter-value-options')
                               .addClass('dropdown-menu')
                               .appendTo(instance._container)
                               .css({ display: 'block', left: -2 + input_offset.left });

      // Store the select dropdown on the input for use in the change handler
      $input.data(namespace + 'filter-value-dropdown', $select_dropdown);

      // Add a "menu item" for each option from the real select
      $select.find('option').each(function () {
        if (this.value == '') {
          return;
        }

        var $link = $('<a></a>')
                      .text(this.text)
                      .attr('href', '#')
                      .data(namespace + 'filter-value-dropdown', $select_dropdown)
                      .data(namespace + 'filter-value-input', $input)
                      .data(namespace + 'filter-value-value', this.value)
                      .data(namespace + 'filter-value-key', key)
                      .addClass(namespace + 'filter-value-link')
                      .click(instance.filterValueDropdownClick);

        // Add to the list
        $('<li></li>')
          .appendTo($select_dropdown)
          .append($link);
      });

      // Highlight the first link
      $select_dropdown.find('a').first().addClass(namespace + 'filter-value-options-active')
    }
  }

  QueryBuild.prototype.filterValueDropdownClick = function () {
    var $input = $(this).data(namespace + 'filter-value-input');
    var $dropdown = $(this).data(namespace + 'filter-value-dropdown');
    var value = $(this).data(namespace + 'filter-value-value');
    var key = $(this).data(namespace +'filter-value-key');
    var instance = $input.data(namespace + 'instance');

    // Remove the dropdown and set the filter value manually
    $dropdown.remove();
    instance._filter[key] = value;
    instance._current_facet = null;
    instance.update();
  }

  $.fn.queryBuild = function (options) {
    return this.each(function () {
      $(this).data('query-build', new QueryBuild($(this), options));
    });
  };
}(jQuery));
