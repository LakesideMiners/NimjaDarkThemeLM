var filter;
var sort;
var editor;
var tagsAll = [];

$(function () {
    filter = new Filter();
    sort = new Sort(filter, $('#results .files'));
    $('.js-filter-toggle, .js-filter-single').each(function(index, cur) {
        tagsAll.push($(cur).data('id'));
    });
    $('#results .files .file').each(function (index, cur) {
        filter.addFile($(cur));
    });
    if ($('#editor').length > 0) {
        editor = new Editor();
        editor.files = filter.files;
        editor.reset();
        $('#editorClear').click(function (e) {
            e.preventDefault();
            editor.clear();
        });
        $('#editor').on('click', 'a.playlistButton', function (e) {
            e.preventDefault();
            var $cur = $(this);
            var id = $cur.data('id');
            var action = $cur.data('action');
            switch (action) {
                case 'up':
                    editor.up(id);
                    break;
                case 'down':
                    editor.down(id);
                    break;
                case 'del':
                    editor.del(id);
                    break;
            }
        });
        $('#editor').on('drag', 'td.droppable', function (e) {
            var id = $(this).data('id');
            editor.dragging = id;
        });
        $('#editor').on('dragover', 'td.droppable', function (e) {
            e.preventDefault();
            $('#editor td.droppable').removeAttr('style');
            $(this).css('borderTop', '1px solid black');
        });
        $('#editor').on('drop', 'td.droppable', function (e) {
            e.preventDefault();
            editor.finishDrag($(this).data('id'));
            $('#editor td.droppable').removeAttr('style');
        });
    }

    if ($('#filter').length > 0) {
        $('#filter').show();
        $('#filter-reset').click(function (e) {
            e.preventDefault();
            sort.reset();
            filter.reset();
        });
        $('#filter-search').keypress(function () {
            filter.checkSearch($(this).val());
        });
        $('#filter-search').keyup(function () {
            filter.checkSearch($(this).val());
        });
        $('.filter-sort').click(function (e) {
            e.preventDefault();
            var $cur = $(this);
            sort.setState($cur.data('state'));
        });
        $('#filter-scroll').click(function (e) {
            e.preventDefault();
            window.scrollTo(0, 0);
        });
        $('.js-filter-toggle').click(function(e) {
            e.preventDefault();
            filter.updateTags($(this));
        });
        $('.js-filter-single').click(function(e) {
            e.preventDefault();
            filter.updateTypes($(this));
        });
        filter.refresh();
    }
    if ($('#playlist-form').length > 0) {
        new Playlist($('#playlist-select'), $('#playlist-form'));
    }
});

/**
 * Filter class, handles filtering.
 * @returns {Filter}
 */
function Editor() {
    var t = this;
    this.files = [];
    this.playlist = [];
    this.$table = $('#editor');
    this.url = this.$table.data('url');
    this.max = parseInt(this.$table.data('max'));
    this.dragging = 0;
    this.$empty = $('#editorEmpty');
    this.$start = $('#editorStart');
    this.$full = $('#editorFull');
    this.charMap = {
        up: {class: 'default', text: '△'},
        down: {class: 'default', text: '▽'},
        del: {class: 'danger', text: '✕'}
    };
    this.rebuild = function () {
        t.$table.empty();
        if (t.playlist.length < 1) {
            t.$empty.show();
            t.$full.hide();
        } else {
            t.$empty.hide();
            t.$full.show();
            t.buildTable();
            t.$start.attr('href', t.makeUrl());
        }
    };
    this.buildTable = function () {
        var max = t.playlist.length - 1;
        for (var i in t.playlist) {
            var file = t.playlist[i];
            var upButton = (i <= 0) ? '' : t.makeButton('up', file.id);
            var downButton = (i >= max) ? '' : t.makeButton('down', file.id);
            var delButton = t.makeButton('del', file.id);
            var fileClass = file.patron ? ' text-warning' : '';
            t.$table.append('<tr><td draggable="true" class="droppable' + fileClass + '" data-id="' + file.id + '" ondragstart="event.dataTransfer.setData(\'text/plain\', \'' + file.id + '\')">' + file.title + '</td><td>' + upButton + '</td><td>' + downButton + '</td><td>' + delButton + '</td><\tr>');
        }
        t.$table.append('<tr><td class="droppable" style="cursor: default;" data-id="-2">&nbsp;</td><td></td><td></td><td></td><\tr>');
    };
    t.makeButton = function (action, id) {
        var char = t.charMap[action];
        return '<a href="" class="btn btn-' + char.class + ' playlistButton btn-clean" data-action="' + action + '" data-id="' + id + '">' + char.text + '</a>';
    };
    this.reset = function () {
        var playlist = t.$full.data('playlist');
        var ids = playlist ? playlist.toString().split(',') : [];
        t.clear(true);
        for (var i in ids) {
            t.add(ids[i], true);
        }
        t.rebuild();
    };
    this.add = function (id, skipRebuild) {
        if (t.playlist.length >= t.max) {
            return;
        }
        var curKey = t.findKey(t.playlist, id);
        var key = t.findKey(t.files, id);
        if (key > -1 && curKey < 0) {
            t.files[key].addEnabled(false);
            t.playlist.push(t.files[key]);
        }
        if (!skipRebuild) {
            t.rebuild();
        }
    };
    this.del = function (id) {
        var key = t.findKey(t.playlist, id);
        if (key > -1) {
            t.playlist[key].addEnabled(true);
            t.playlist.splice(key, 1);
        }
        t.rebuild();
    };
    this.clear = function(skipRebuild)
    {
        for (var i in t.playlist) {
            t.playlist[i].addEnabled(true);
        }
        t.playlist = [];
        if (!skipRebuild) {
            t.rebuild();
        }
    };
    this.up = function (id) {
        var key = t.findKey(t.playlist, id);
        if (key > 0) {
            t.switchKeys(key, key - 1);
        }
        t.rebuild();
    };
    this.down = function (id) {
        var key = t.findKey(t.playlist, id);
        if (key > -1 && key < t.playlist.length - 1) {
            t.switchKeys(key, key + 1);
        }
        t.rebuild();
    };
    this.switchKeys = function (key1, key2) {
        var temp = t.playlist[key1];
        t.playlist[key1] = t.playlist[key2];
        t.playlist[key2] = temp;
    };
    this.finishDrag = function(destinationId) {
        var keyFrom = t.findKey(t.playlist, t.dragging);
        var keyTo = destinationId > -2 ? t.findKey(t.playlist, destinationId) : -2;
        var file = t.playlist[keyFrom];
        t.dragging = 0;
        if (keyFrom == keyTo || keyFrom == -1 || keyTo == -1) {
            return;
        } else if (keyTo == -2) {
            t.playlist.splice(keyFrom, 1);
            t.playlist.push(file);
        } else if (keyFrom < keyTo) {
            t.playlist.splice(keyTo, 0, file);
            t.playlist.splice(keyFrom, 1);
        } else if (keyFrom > keyTo) {
            t.playlist.splice(keyFrom, 1);
            t.playlist.splice(keyTo, 0, file);
        }
        t.rebuild();
    };
    this.findKey = function (array, id) {
        var result = -1;
        for (var i in array) {
            if (array[i].id == id) {
                result = i;
                break;
            }
        }
        return parseInt(result);
    };
    this.makeUrl = function() {
        var ids = [];
        for (var i in t.playlist) {
            ids.push(t.playlist[i].id);
        }
        return '//hypno.nimja.com/' + t.url + ids.join('-');
    };
}

var fileTypes = [
    'typePlatform',
    'typeType',
    'typeLength',
    'typeGender',
    'typeParticipation',
    'typeObedience',
    'typeArousal',
    'typeOrgasms'
];

/**
 * File class.
 * @param {jquery object} $file
 * @returns {File}
 */
function File($file) {
    var t = this;
    this.file = $file;
    this.data = {};
    this.patron = ($file.data('patron'));
    this.id = $file.data('id');
    this.title = $file.find('h4').text().trim();
    this.$addButton = $file.find('.playlist');
    this.$addButton.click(function (e) {
        e.preventDefault();
        if (editor) {
            editor.add(t.id);
        }
    });
    this.description = $file.find('.description').text().trim();
    this.searchText = (t.title + ' ' + t.description).toLowerCase();
    this.visible = true;
    this.tags = {};

    this.init = function(currentTags) {
        for (var i in tagsAll) {
            var tagId = tagsAll[i].toString();
            t.tags[tagId] = currentTags.indexOf(tagId) > -1;
        }
    };
    t.init(t.file.data('tags').toString().split(','));

    this.match = function (tagSearch, stringSearch) {
        var result = (tagSearch) ? t.tagSearch(tagSearch) : true;
        if (result) {
            result = (stringSearch && stringSearch.length > 0) ? t.textSearch(stringSearch) : true;
        }
        return result;
    };
    this.show = function (tagSearch, stringSearch) {
        var visible = t.match(tagSearch, stringSearch);
        if (visible == t.visible) {
            return;
        }
        t.visible = visible;
        t.file.toggle(visible);
    };
    /**
     *
     * @param {Array} search
     * @returns {Boolean}
     */
    this.textSearch = function (words) {
        var result = true;
        for (var index in words) {
            var word = words[index];
            var found = t.searchText.search(word);
            if (found < 0) {
                result = false;
                break;
            }
        }
        return result;
    };
    /**
     * Search in order of rejection, the sooner we reject, the faster.
     *
     * @param {Object} tagSearch
     * @returns {Boolean}
     */
    this.tagSearch = function(tagSearch) {
        var result = false;
        if (tagSearch.hasOwnProperty('not') && tagSearch.not.length > 0) {
            for (var index in tagSearch.not) {
                if (t.tags[tagSearch.not[index]]) {
                    return false;
                }
            }
        }
        if (tagSearch.hasOwnProperty('and') && tagSearch.and.length > 0) {
            for (var index in tagSearch.and) {
                if (t.tags[tagSearch.and[index]]) {
                    result = true;
                } else {
                    return false;
                }
            }
        }
        if (tagSearch.hasOwnProperty('or') && tagSearch.or.length > 0) {
            result = false;
            for (var index in tagSearch.or) {
                if (t.tags[tagSearch.or[index]]) {
                    return true;
                }
            }
        }
        return result;
    };
    /**
     * CHeck if tagId exist, or if tagId is negative, if it does NOT exist.
     * @param {int} tagId
     * @returns {Boolean}
     */
    this.hasTagId = function(tagId) {
        return (t.tags.indexOf(tagId.toString()) > -1);
    };
    /**
     * If the add button is shown.
     * @param {type} enabled
     * @returns {undefined}
     */
    this.addEnabled = function(enabled) {
        if (enabled) {
            t.$addButton.removeAttr('style');
        } else {
            t.$addButton.css('visibility', 'hidden');
        }
    };
}

/**
 * Filter class, handles filtering.
 * @returns {Filter}
 */
function Filter() {
    var t = this;
    this.types = [];
    this.files = [];
    this.visible = [];

    this.searchTags = {};
    this.searchText = '';
    this.lastRandom = [];
    this.skipRefresh = false;
    var $tagList = $('.js-filter-toggle');
    var $typeList = $('.js-filter-single');
    var $searchBox = $('#filter-search');
    var $filterEmptyText = $('#filter-empty');
    var $filterScrollButton = $('#filter-scroll');
    var class_on = 'btn-primary';
    /**
     * Apply filter.
     * @param {Object} searchTags
     * @param {Array} searchText
     * @returns {void}
     */
    this.apply = function (searchTags, searchText) {
        if (t.skipRefresh) {
            return;
        }
        searchTags = searchTags || t.searchTags;
        searchText = searchText || t.searchText;
        if (searchTags == undefined) {
            searchTags = t.searchTags;
        }
        t.lastRandom = [];
        t.visible = [];
        var searchWords = searchText && searchText.length > 0 ? searchText.split(/\s+/) : [];
        var filteredTags = {};
        for (var i in t.files) {
            var file = t.files[i];
            file.show(searchTags, searchWords);
            if (file.visible) {
                t.visible.push(file);
            }
        }
        $('#results .results').html(t.visible.length + ' results');
        $filterEmptyText.toggle(t.visible.length == 0);
        $filterScrollButton.toggle(t.visible.length > 10);
    };

    this.checkSearch = function (string) {
        var searchText = string.toString().trim().replace(/\s+/g, " ").toLowerCase();
        if (searchText != t.searchText) {
            t.searchText = searchText;
            t.apply();
        }
    };
    this.updateTags = function($cur) {
        $cur.toggleClass(class_on);
        t.updateTagsAndType();
    };
    this.updateTypes = function($cur) {
        $cur.siblings('.' + class_on).removeClass(class_on);
        $cur.toggleClass(class_on);
        t.updateTagsAndType();
    };
    this.updateTagsAndType = function() {
        var enabled = [];
        $tagList.each(function(index, cur) {
            var $cur = $(cur);
            if ($cur.hasClass(class_on)) {
                enabled.push($cur.data('id'));
            }
        });
        $typeList.each(function(index, cur) {
            var $cur = $(cur);
            if ($cur.hasClass(class_on)) {
                enabled.push($cur.data('id'));
            }
        });
        t.searchTags = enabled.length > 0 ? {and: enabled} : false;
        t.apply();
    };
    this.refresh = function () {
        t.skipRefresh = true;
        t.checkSearch($searchBox.val());
        t.updateTagsAndType();
        t.skipRefresh = false;
        t.apply();
    };
    this.addType = function ($cur) {
        t.types.push(new Type($cur));
    };
    this.addFile = function ($cur) {
        t.files.push(new File($cur));
    };
    this.reset = function () {
        $searchBox.val('');
        $tagList.removeClass(class_on);
        $typeList.removeClass(class_on);
        t.refresh();
    };
}

function Playlist($select, $form) {
    var t = this;
    this.$select = $select;
    this.$form = $form;
    this.refresh = function () {
        var selection = t.$select.val();
        if (!playlists || !playlists[selection]) {
            return;
        }
        var playlist = t.create(playlists[selection]);
        t.showPlaylist(playlist);
    };
    this.showPlaylist = function (files)
    {
        if (editor) {
            editor.clear(true);
            if (files.length > 0) {
                for (var i in files) {
                    var file = files[i];
                    editor.add(file.id, true);
                }
            }
            editor.rebuild();
            return;
        }
        $('#results .files').append($('#results .selected .file'));
        $('#results .selected .watch').remove();
        if (files.length < 1) {
            return;
        }
        var youtubeIds = [];
        var fileIds = [];
        for (var i in files) {
            var file = files[i];
            fileIds.push(file.id);
            if (file.youtubeId) {
                youtubeIds.push(file.youtubeId);
            }
            $('#results .selected').append(file.file);
        }
        var url = '/listen/play/' + fileIds.join('-');
        $('#results .selected').append('<p class="watch" style="margin-top: 20px;"><a href="' + url + '" class="btn btn-block btn-info">Stream playlist</a></p>');
    };
    this.filterFiles = function (cur, excludeIds)
    {
        var excluded = excludeIds ? excludeIds : [];
        var result = [];
        for (var i in filter.files) {
            var file = filter.files[i];
            if (file.match(cur, []) && excluded.indexOf(file.id) < 0) {
                result.push(file);
            }
        }
        return result;
    };
    this.create = function (filters) {
        $('#results .files').append($('#results .selected .file'));
        $('#results .selected .watch').remove();
        var result = [];
        var fileIds = [];
        for (var i in filters) {
            var files = t.filterFiles(filters[i], fileIds);
            var file = t.selectRandom(files);
            if (file) {
                fileIds.push(file.id);
                result.push(file);
            }
        }
        return result;
    };
    this.selectRandom = function (files) {
        if (files.length < 1) {
            return null;
        } else if (files.length == 1) {
            return files[0];
        } else {
            var index = Math.floor(Math.random() * files.length);
            return files[index];
        }
    };
    this.$select.change(t.refresh);
    this.$form.submit(function (event) {
        event.preventDefault();
        t.refresh();
    });
    t.refresh();
}


/**
 * Sort class, for the type filters.
 * @param {Files} files
 * @returns {Sort}
 */
function Sort(files, $holder) {
    var t = this;
    this.files = files;
    this.$holder = $holder;
    this.state = 0;
    this.reset = function () {
        t.setState(0);
    };
    this.normal = function () {
        t.applySorting(t.getIndexes());
    };
    this.reverse = function () {
        t.applySorting(t.getIndexes().reverse());
    };
    this.random = function () {
        t.applySorting(t.shuffle(t.getIndexes()));
    };
    this.selectNext = function () {
        t.state++;
        if (t.state > 2) {
            t.state = 0;
        }
        t.applyState();
    };
    this.setState = function(state) {
        var newState = parseInt(state);
        if (newState != t.state || newState == 2) {
            t.state = newState;
            t.applyState();
        }
    };
    this.applyState = function () {
        if (t.state == 2) {
            t.random();
        } else if (t.state == 1) {
            t.reverse();
        } else {
            t.normal();
        }
    };
    this.getIndexes = function () {
        var indexes = [];
        var max = t.files.files.length;
        for (var i = 0; i < max; i++) {
            indexes.push(i);
        }
        return indexes;
    };
    this.applySorting = function (indexes) {
        var parent = t.$holder.parent();
        t.$holder.detach();
        for (var i in indexes) {
            var file = t.files.files[indexes[i]];
            file.file.appendTo(t.$holder);
        }
        t.$holder.appendTo(parent);
    };
    this.shuffle = function (array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    };
}