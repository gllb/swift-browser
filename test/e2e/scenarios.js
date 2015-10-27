'use strict';

var SwiftMock = require('../swift-mock.js');
var path = require('path');
var fs = require('fs');
var tmp = require('tmp');
var Q = require('q');

var mktemp = Q.nfbind(tmp.file);

describe('my app', function () {
    it('should redirect to /#/ when fragment is empty', function () {
        browser.get('index.html');
        expect(browser.getLocationAbsUrl()).toEqual('/');
    });
});

function uploadFile(path) {
    browser.executeScript(function () {
        var file = document.getElementById('fileInput');
        angular.element(file).removeClass('hidden');
    }).then(function () {
        $('#fileInput').sendKeys(path);
    });
}

describe('Container listing', function () {
    describe('should show empty indicator', function () {
        it('when there are no containers', function () {
            browser.get('index.html#/');
            expect($('td.empty').isDisplayed()).toBe(true);
        });

        it('unless there are containers', function () {
            SwiftMock.addContainer('foo');
            browser.get('index.html#/');
            expect($('td.empty').isDisplayed()).toBe(false);
        });
    });

    describe('should be sortable', function () {
        beforeEach(function () {
            SwiftMock.setObjects('foo', {
                'x.txt': {headers: {
                    'Content-Length': 1000,
                }},
                'y.txt': {headers: {
                    'Content-Length': 234,
                }}
            });
            SwiftMock.setObjects('bar', {
                'x.txt': {headers: {
                    'Content-Length': 2345,
                }}
            });
            browser.get('index.html#/');
        });

        it('by name', function () {
            var rows = by.repeater('container in containers');
            var names = element.all(rows.column('container.name'));

            // Initial sort order is by name
            expect(names.getText()).toEqual(['bar', 'foo']);
            // Clicking the name header sorts reverses the order
            $('th:nth-child(2)').click();
            expect(names.getText()).toEqual(['foo', 'bar']);
        });

        it('by size', function () {
            var sizes = $$('td[sb-format-bytes]');

            // Initial sort is by name
            expect(sizes.getText()).toEqual(['2.3 KB', '1.2 KB']);
            // Clicking the header sorts
            $$('th').get(2).click();
            expect(sizes.getText()).toEqual(['1.2 KB', '2.3 KB']);
            // Clicking again reverses
            $$('th').get(2).click();
            expect(sizes.getText()).toEqual(['2.3 KB', '1.2 KB']);
        });

        it('by count', function () {
            var rows = by.repeater('container in containers');
            var counts = element.all(rows.column('container.count | number'));

            // Initial sort order is by name
            expect(counts.getText()).toEqual(['1 objects', '2 objects']);
            // Clicking the header sorts (no change)
            $$('th').get(3).click();
            expect(counts.getText()).toEqual(['1 objects', '2 objects']);
            // Clicking the header sorts reverses the order
            $$('th').get(3).click();
            expect(counts.getText()).toEqual(['2 objects', '1 objects']);
        });
    });

    describe('selection', function () {
        beforeEach(function () {
            SwiftMock.addContainer('foo');
            SwiftMock.addContainer('bar');
            browser.get('index.html#/');
        });

        var toggle = $('th.toggle input');
        var checkboxes = element.all(by.model('container.selected'));

        it('should be deselected by default', function () {
            expect(toggle.isSelected()).toBe(false);
            expect(checkboxes.isSelected()).toEqual([false, false]);
        });

        it('should allow toggle all', function () {
            toggle.click();
            expect(checkboxes.isSelected()).toEqual([true, true]);
        });

        it('should notice manually selecting all', function () {
            checkboxes.click();
            expect(toggle.isSelected()).toBe(true);
        });
    });

    describe('with no containers', function () {
        it('should not show all containers selected', function () {
            browser.get('index.html#/');

            var toggle = $('th.toggle input');
            expect(toggle.isSelected()).toBe(false);
        });
    });

    it('should allow creating a new container', function () {
        var rows = by.repeater('container in containers');
        var names = element.all(rows.column('container.name'));
        var sizes = $$('td[sb-format-bytes]');
        var counts = element.all(rows.column('container.count | number'));
        var openBtn = $('.btn[ng-click="create()"]');
        var createBtn = $('.btn[ng-click="$close(name)"]');
        var input = $('.modal-body input');

        browser.get('index.html#/');
        openBtn.click();
        input.sendKeys('foo');
        createBtn.click();

        expect(names.getText()).toEqual(['foo']);
        expect(sizes.getText()).toEqual(['0.0 B']);
        expect(counts.getText()).toEqual(['0 objects']);
    });

    it('should not allow a slash in a container name', function () {
        var openBtn = $('.btn[ng-click="create()"]');
        var createBtn = $('.btn[ng-click="$close(name)"]');
        var input = $('.modal-body input');
        var help = $('.modal-body .help-block');
        browser.get('index.html#/');

        openBtn.click();
        expect(createBtn.isEnabled()).toBe(false);
        expect(help.isDisplayed()).toBe(false);

        input.sendKeys('foo');
        expect(createBtn.isEnabled()).toBe(true);
        expect(help.isDisplayed()).toBe(false);

        input.sendKeys('/bar');
        expect(createBtn.isEnabled()).toBe(false);
        expect(help.isDisplayed()).toBe(true);
    });

    it('should create container when pressing enter', function () {
        var rows = by.repeater('container in containers');
        var names = element.all(rows.column('container.name'));
        var openBtn = $('.btn[ng-click="create()"]');
        var input = $('.modal-body input');
        browser.get('index.html#/');

        openBtn.click();
        input.sendKeys('foo', protractor.Key.ENTER);
        expect(names.getText()).toEqual(['foo']);
    });

    describe('deleting containers', function () {
        var deleteBtn = $('.btn[ng-click="delete()"]');
        var closeBtn = $('.btn[ng-click="$close()"]');
        var toggles = element.all(by.model('container.selected'));

        it('should succeed with empty container', function () {
            SwiftMock.addContainer('foo');
            browser.get('index.html#/');

            expect(deleteBtn.isEnabled()).toBe(false);
            toggles.first().click();
            deleteBtn.click();
            closeBtn.click();
            expect(toggles.count()).toBe(0);
        });

        it('should succeed with non-empty container', function () {
            SwiftMock.setObjects('foo', {
                'x.txt': {},
                'nested/y.txt': {},
            });
            browser.get('index.html#/');
            toggles.first().click();
            deleteBtn.click();
            closeBtn.click();
            expect(toggles.count()).toBe(0);
        });
    });
});


describe('Object listing', function () {
    describe('should show empty indicator', function () {
        it('when there are no objects', function () {
            SwiftMock.addContainer('foo');
            browser.get('index.html#/foo/');
            expect($('td.empty').isDisplayed()).toBe(true);
        });

        it('unless there are containers', function () {
            SwiftMock.setObjects('foo', {
                'x.txt': {headers: {
                    'Content-Length': 20,
                }},
            });
            browser.get('index.html#/foo/');
            expect($('td.empty').isDisplayed()).toBe(false);
        });
    });

    describe('should be sortable', function () {
        beforeEach(function () {
            SwiftMock.setObjects('foo', {
                'x.txt': {headers: {
                    'Content-Length': 20,
                }},
                'y.txt': {headers: {
                    'Content-Length': 10,
                }}
            });
            browser.get('index.html#/foo/');
        });

        it('by name', function () {
            var rows = by.repeater('item in items');
            var names = element.all(rows.column('item.title'));

            // Initial sort order is by name
            expect(names.getText()).toEqual(['x.txt', 'y.txt']);
            // Clicking the name header sorts reverses the order
            $$('th').get(1).click();
            expect(names.getText()).toEqual(['y.txt', 'x.txt']);
        });

        it('by size', function () {
            var sizes = $$('td[sb-format-bytes]');

            // Initial sort order is by name
            expect(sizes.getText()).toEqual(['20.0 B', '10.0 B']);
            // Clicking the header sorts
            $('th:last-child').click();
            expect(sizes.getText()).toEqual(['10.0 B', '20.0 B']);
        });
    });

    it('should understand pseudo-directories', function () {
        SwiftMock.setObjects('foo', {
            'x.txt': {},
            'dir/y.txt': {}
        });
        browser.get('index.html#/foo/');

        var rows = by.repeater('item in items');
        var names = element.all(rows.column('item.title'));
        expect(names.getText()).toEqual(['dir/', 'x.txt']);
    });

    it('should understand deep pseudo-directories', function () {
        SwiftMock.setObjects('foo', {
            'x.txt': {},
            'deeply/y.txt': {},
            'deeply/nested/z.txt': {},
        });
        browser.get('index.html#/foo/');

        var rows = by.repeater('item in items');
        var links = element.all(rows.column('item.title'));
        expect(links.getText()).toEqual(['deeply/', 'x.txt']);
        links.first().click();

        expect(links.getText()).toEqual(['nested/', 'y.txt']);
        links.first().click();

        expect(links.getText()).toEqual(['z.txt']);
    });

    describe('selection', function () {
        beforeEach(function () {
            SwiftMock.setObjects('foo', {
                'x.txt': {},
                'y.txt': {},
            });
            browser.get('index.html#/foo/');
        });

        var toggle = $('th.toggle input');
        var checkboxes = element.all(by.model('item.selected'));

        it('should be deselected by default', function () {
            expect(toggle.isSelected()).toBe(false);
            expect(checkboxes.isSelected()).toEqual([false, false]);
        });

        it('should allow toggle all', function () {
            toggle.click();
            expect(checkboxes.isSelected()).toEqual([true, true]);
        });

        it('should notice manually selecting all', function () {
            checkboxes.click();
            expect(toggle.isSelected()).toBe(true);
        });
    });

    describe('with no objects', function () {
        it('should not show all objects selected', function () {
            SwiftMock.addContainer('foo');
            browser.get('index.html#/foo/');

            var toggle = $('th.toggle input');
            expect(toggle.isSelected()).toBe(false);
        });
    });

    it('should allow deletion', function () {
        SwiftMock.setObjects('foo', {
            'x.txt': {},
            'y.txt': {},
            'z.txt': {},
        });
        browser.get('index.html#/foo/');
        var rows = by.repeater('item in items');
        var names = element.all(rows.column('item.title'));
        var checkboxes = element.all(by.model('item.selected'));
        var deleteBtn = $('.btn[ng-click="delete()"]');

        expect(deleteBtn.isEnabled()).toBe(false);
        checkboxes.get(0).click();
        checkboxes.get(2).click();
        deleteBtn.click();

        var modalNames = $('div.modal').all(rows.column('item.title'));
        var modalCheckboxes = $('div.modal').all(by.model('item.selected'));
        var modalTitle = $('div.modal h3');
        var closeBtn = $('div.modal .btn[ng-click="$close()"]');

        expect(modalTitle.getText()).toMatch('Deleting 2 objects');
        expect(modalNames.getText()).toEqual(['x.txt', 'z.txt']);
        expect(modalCheckboxes.isSelected()).toEqual([true, true]);

        $('div.modal th:nth-child(1) input').click();
        expect(modalCheckboxes.isSelected()).toEqual([false, false]);
        expect(closeBtn.isEnabled()).toBe(false);

        modalCheckboxes.last().click();
        expect(modalTitle.getText()).toMatch('Deleting 1 objects');

        closeBtn.click();
        expect(modalTitle.isPresent()).toBe(false);

        expect(checkboxes.isSelected()).toEqual([true, false]);
        expect(names.getText()).toEqual(['x.txt', 'y.txt']);
    });

    it('should allow deleting pseudo-directories', function () {
        SwiftMock.setObjects('foo', {
            'x.txt': {},
            'bar/y.txt': {},
            'bar/z.txt': {},
        });
        browser.get('index.html#/foo/');

        var rows = by.repeater('item in items');
        var names = element.all(rows.column('item.title'));
        var checkboxes = element.all(by.model('item.selected'));
        var modalNames = $('div.modal').all(rows.column('item.title'));
        var deleteBtn = $('.btn[ng-click="delete()"]');
        var closeBtn = $('div.modal .btn[ng-click="$close()"]');

        checkboxes.first().click();
        deleteBtn.click();
        expect(modalNames.getText()).toEqual(['bar/']);

        closeBtn.click();
        expect(names.getText()).toEqual(['x.txt']);
    });

    it('should allow uploading files', function () {
        SwiftMock.setObjects('foo', {
            'nested/x.txt': {},
        });
        browser.get('index.html#/foo/nested/');

        var openModalBtn = $('.btn[ng-click="upload()"]');
        var rows = by.repeater('item in items');
        var names = element.all(rows.column('item.title'));
        expect(names.getText()).toEqual(['x.txt']);

        openModalBtn.click();
        expect($('div.modal h3').getText()).toMatch('to foo/nested/');

        // Test with two paths where the first sort after the second
        var p1 = mktemp({prefix: 'b'});
        var p2 = mktemp({prefix: 'a'});
        Q.all([p1, p2]).spread(function (res1, res2) {
            var paths = [res1[0], res2[0]];
            paths.forEach(uploadFile);

            var uploadBtn = $('.btn[ng-click="uploadFiles()"]');
            var files = by.repeater('file in files');
            var uploads = element.all(files.column('file.name'));
            var newNames = paths.map(path.basename);
            expect(uploads.getText()).toEqual(newNames);

            expect(uploadBtn.isEnabled()).toBe(true);
            uploadBtn.click();
            var progBar = $$('div.progress-bar').first();
            expect(progBar.getAttribute('aria-valuenow')).toBe('100');
            expect(uploadBtn.isEnabled()).toBe(false);

            $('.btn[ng-click="$dismiss()"]').click();
            expect($('div.modal h3').isPresent()).toBe(false);

            var expected = paths.map(path.basename);
            expected.push('x.txt');
            expected.sort();
            expect(names.getText()).toEqual(expected);
        });
    });

    it('should allow unscheduling files for upload', function () {
        SwiftMock.addContainer('foo');
        browser.get('index.html#/foo/');

        var rows = by.repeater('item in items');
        var names = element.all(rows.column('item.title'));
        $('.btn[ng-click="upload()"]').click();

        Q.all([mktemp(), mktemp()]).spread(function (res1, res2) {
            var paths = [res1[0], res2[0]];
            var files = by.repeater('file in files');
            var uploads = element.all(files.column('file.name'));
            var base = path.basename(paths[1]);
            paths.forEach(uploadFile);

            // Remove the first file, expect that the second is still
            // there and that it's the only one.
            $$('a[ng-click="remove($index)"]').first().click();
            expect(uploads.getText()).toEqual([base]);

            $('.btn[ng-click="uploadFiles()"]').click();
            $('.btn[ng-click="$dismiss()"]').click();
            expect(names.getText()).toEqual([base]);
        });
    });

    it('should set Content-Length correctly for uploaded files', function () {
        SwiftMock.addContainer('foo');
        browser.get('index.html#/foo/');
        $('.btn[ng-click="upload()"]').click();

        var sizes = $$('td[sb-format-bytes]');

        // Two files with a known sort order
        var tmpX = mktemp({prefix: 'x'});
        var tmpY = mktemp({prefix: 'y'});
        Q.all([tmpX, tmpY]).spread(function (x, y) {
            var buf = new Buffer(1234);
            var bytesWritten = fs.writeSync(x[1], buf, 0, buf.length);
            expect(bytesWritten).toEqual(buf.length);

            uploadFile(x[0]);
            uploadFile(y[0]);
            expect(sizes.getText()).toEqual(['1.2 KB', '0.0 B']);

            $('.btn[ng-click="uploadFiles()"]').click();
            $('.btn[ng-click="$dismiss()"]').click();

            var contentLength = $('.content-length td:nth-child(2)');
            $$('td a').first().click();
            expect(contentLength.getText()).toEqual('1234');

            $$('.breadcrumb a').last().click();

            $$('td a').last().click();
            expect(contentLength.getText()).toEqual('0');
        });
    });

    it('should set Content-Type correctly for uploaded files', function () {
        SwiftMock.addContainer('foo');
        browser.get('index.html#/foo/');
        $('.btn[ng-click="upload()"]').click();

        var rows = by.repeater('file in files');
        var types = element.all(rows.column('file.type'));

        mktemp({postfix: '.html'}).spread(function (filename) {
            uploadFile(filename);
            expect(types.getText()).toEqual(['text/html']);
            $('.btn[ng-click="uploadFiles()"]').click();
            $('.btn[ng-click="$dismiss()"]').click();

            $('td a').click();
            var input = $('.content-type').$('input');
            expect(input.getAttribute('value')).toEqual('text/html');
        });
    });

    it('should allow copying files', function () {
        SwiftMock.setObjects('foo', {
            'nested/x.txt': {},
        });
        SwiftMock.addContainer('bar');
        browser.get('index.html#/foo/nested/');

        var rows = by.repeater('item in items');
        var checkboxes = element.all(by.model('item.selected'));
        var names = element.all(rows.column('item.title'));
        var openCopyModalBtn = $('.btn[ng-click="copy()"]');
        var copyBtn = $('div.modal .btn[ng-click="copyObjects()"]');
        var closeBtn = $('div.modal .btn[ng-click="$dismiss()"]');
        var modalTitle = $('div.modal h3');
        var modalNames = $('div.modal').all(rows.column('item.title'));
        var successes = $$('div.modal td:nth-child(3) .glyphicon-ok');
        var containers = element.all(
            by.options('c.name as c.name for c in containers')
        );
        var destDirectory = element(by.model('directory'));

        expect(openCopyModalBtn.isEnabled()).toBe(false);
        checkboxes.click();
        openCopyModalBtn.click();

        expect(modalTitle.getText()).toEqual('Copying 1 objects');
        expect(modalNames.getText()).toEqual(['x.txt']);
        expect(containers.getText()).toEqual(['bar', 'foo']);
        expect(containers.get(1).isSelected()).toBe(true);
        expect(destDirectory.getAttribute('value')).toEqual('nested/');
        expect(copyBtn.isEnabled()).toBe(true);

        containers.get(0).click();
        destDirectory.clear();
        destDirectory.sendKeys('copied');

        copyBtn.click();
        expect(successes.count()).toBe(1);
        expect(copyBtn.isEnabled()).toBe(false);

        closeBtn.click();
        $$('.breadcrumb a').first().click();
        $$('td a').first().click(); // index.html#/bar/
        expect(names.getText()).toEqual(['copied/']);
        $$('td a').first().click(); // enter index.html#/bar/copied/
        expect(names.getText()).toEqual(['x.txt']);
    });
});

describe('Listing a pseudo-directory', function () {
    it('should add traling slash', function () {
        SwiftMock.setObjects('foo', {
            'bar/baz.txt': {},
        });
        browser.get('index.html#/foo/bar');

        var url = browser.getLocationAbsUrl();
        expect(url).toEqual('/foo/bar/');
    });
});

describe('Object metadata', function () {
    beforeEach(function () {
        SwiftMock.setObjects('foo', {
            'bar/baz.txt': {headers: {
                'ETag': '401b30e3b8b5d629635a5c613cdb7919',
                'Last-Modified': 'Sat, 16 Aug 2014 13:33:21 GMT',
                'Content-Length': 20,
                'Content-Type': 'text/plain',
                'Content-Encoding': 'gzip'
            }}
        });
        browser.get('index.html#/foo/bar/baz.txt');
    });

    function td(rows, row, col) {
        col += 1; // css child selectors are 1-based
        return element(rows.row(row)).$('td:nth-child(' + col + ')');
    }
    function getText(el) {
        return el.getText();
    }
    function textInRow(rows, idx) {
        return element(rows.row(idx)).$$('td').map(getText);
    }

    it('should show metadata', function () {
        var rows = by.repeater('header in headers.sys');
        expect(element.all(rows).count()).toEqual(5);

        expect(textInRow(rows, 0)).toEqual([
            'etag', '401b30e3b8b5d629635a5c613cdb7919', ''
        ]);
        expect(textInRow(rows, 1)).toEqual([
            'last-modified', 'Sat, 16 Aug 2014 13:33:21 GMT', ''
        ]);
        expect(textInRow(rows, 2)).toEqual([
            'content-length', '20', ''
        ]);
        var input = td(rows, 3, 1).$('input');
        expect(td(rows, 3, 0).getText()).toEqual('content-type');
        expect(input.getAttribute('value')).toEqual('text/plain');
    });

    it('should allow editing metadata', function () {
        var rows = by.repeater('header in headers.sys');
        var contentType = td(rows, 3, 1).$('input');
        var saveBtn = $('.btn[ng-click="save()"]');

        expect(saveBtn.isEnabled()).toBe(false);
        contentType.clear();
        contentType.sendKeys('image/png');
        expect(saveBtn.isEnabled()).toBe(true);
        saveBtn.click();

        // Reload data from simulator
        $$('.breadcrumb a').last().click();
        $('td a').click();

        expect(contentType.getAttribute('value')).toEqual('image/png');
    });

    it('should allow adding system headers', function () {
        var rows = by.repeater('header in headers.sys');
        var saveBtn = $('.btn[ng-click="save()"]');
        var addBtn = $('.btn[ng-click="add(\'sys\')"]');
        var options = element.all(
            by.options('name for name in removableHeaders')
        );
        var input = td(rows, 5, 1).$('input');
        var p = td(rows, 5, 0).$('p');

        addBtn.click();
        expect(saveBtn.isEnabled()).toBe(false);
        expect(options.getText()).toEqual([
            'content-encoding', 'content-disposition', 'x-delete-at'
        ]);
        expect(options.get(0).isSelected()).toBe(true);
        options.get(1).click();
        input.sendKeys('attachment');

        expect(saveBtn.isEnabled()).toBe(true);
        saveBtn.click();
        expect(options.count()).toBe(0);
        expect(p.getText()).toEqual('content-disposition');

        // Reload data from simulator
        $$('.breadcrumb a').last().click();
        $('td a').click();

        expect(p.getText()).toEqual('content-disposition');
    });

    it('should allow adding metadata', function () {
        var rows = by.repeater('header in headers.meta');
        var saveBtn = $('.btn[ng-click="save()"]');
        var addBtn = $('.btn[ng-click="add(\'meta\')"]');
        var input = td(rows, 0, 0).$('input');
        var p = td(rows, 0, 0).$('p');

        addBtn.click();
        expect(input.getAttribute('value')).toEqual('x-object-meta-');

        input.sendKeys('foobar');
        saveBtn.click();
        expect(input.isPresent()).toBe(false);
        expect(p.getText()).toEqual('x-object-meta-foobar');

        // Reload data from simulator
        $$('.breadcrumb a').last().click();
        $('td a').click();

        expect(p.getText()).toEqual('x-object-meta-foobar');
    });

    it('should allow removing headers', function () {
        var rows = by.repeater('header in headers.sys');
        var names = element.all(rows.column('header.name'));
        var trashLink = td(rows, 4, 2).$('a');
        var saveBtn = $('.btn[ng-click="save()"]');

        expect(names.getText()).toEqual([
            'etag',
            'last-modified',
            'content-length',
            'content-type',
            'content-encoding'
        ]);
        trashLink.click();
        expect(names.getText()).toEqual([
            'etag',
            'last-modified',
            'content-length',
            'content-type'
        ]);
        expect(saveBtn.isEnabled()).toBe(true);
        saveBtn.click();

        // Reload data from simulator
        $$('.breadcrumb a').last().click();
        $('td a').click();
        expect(names.getText()).toEqual([
            'etag',
            'last-modified',
            'content-length',
            'content-type'
        ]);
    });

    it('should not allow removing the Content-Type header', function () {
        var rows = by.repeater('header in headers.sys');
        expect(td(rows, 3, 0).getText()).toEqual('content-type');
        expect(td(rows, 3, 2).$('a').isPresent()).toBe(false);
    });
});

describe('Object content', function () {
    var editBtn = $('.btn[ng-click="edit()"]');

    beforeEach(function () {
        SwiftMock.setObjects('foo', {
            'bar.html': {
                headers: {
                    'Content-Type': 'text/html',
                    'X-Object-Meta-Foo': 'bar',
                },
                content: 'Hello <i>World</i>\n'
            }
        });
        browser.get('index.html#/foo/bar.html');
        editBtn.click();
    });

    function callEditorMethod (method) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            args = JSON.stringify(args);
            function script(method, args) {
                args = JSON.parse(args);
                var elms = document.getElementsByClassName('CodeMirror');
                var editor = elms[0].CodeMirror;
                return editor[method].apply(editor, args);
            }
            return browser.driver.executeScript(script, method, args);
        };
    }

    var getValue = callEditorMethod('getValue');
    var setValue = callEditorMethod('setValue');
    var getOption = callEditorMethod('getOption');
    var saveBtn = $('.modal-footer .btn[ng-click="save()"]');
    var closeBtn = $('.modal-footer .btn[ng-click="$close()"]');

    it('should allow showing object content', function () {
        expect(getValue()).toEqual('Hello <i>World</i>\n');
    });

    it('should set mode based on MIME type', function () {
        expect(getOption('mode')).toEqual('htmlmixed');
    });

    it('should allow editing object content', function () {
        setValue('<b>Hi!</b>\n');
        saveBtn.click();
        closeBtn.click();
        editBtn.click();
        expect(getValue()).toEqual('<b>Hi!</b>\n');
    });

    it('should preserve Content-Type after edit', function () {
        setValue('<b>Hi!</b>\n');
        saveBtn.click();
        closeBtn.click();
        $$('.breadcrumb a').last().click();
        $('td a').click();
        var contentType = $('.content-type input');
        expect(contentType.getAttribute('value')).toEqual('text/html');
    });

    it('should preserve custom metadata after edit', function () {
        setValue('<b>Hi!</b>\n');
        saveBtn.click();
        closeBtn.click();
        $$('.breadcrumb a').last().click();
        $('td a').click();
        expect($('.x-object-meta-foo').isPresent()).toBe(true);
    });

    it('should enable save button when editing', function () {
        expect(saveBtn.isEnabled()).toBe(false);
        setValue('<b>Hi!</b>\n');
        expect(saveBtn.isEnabled()).toBe(true);
    });

    it('should disable save button after save', function () {
        setValue('<b>Hi!</b>\n');
        expect(saveBtn.isEnabled()).toBe(true);
        saveBtn.click();
        expect(saveBtn.isEnabled()).toBe(false);
    });
});
