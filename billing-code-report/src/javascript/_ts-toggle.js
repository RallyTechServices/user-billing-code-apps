Ext.define('Rally.technicalservices.Toggle', {
    extend:'Ext.Container',
    alias:'widget.tstoggle',

    componentCls: 'rui-gridboard-toggle toggle-button-group',
    layout: 'hbox',
    border: 1,
    activeButtonCls: 'rly-active hide-tooltip',

    toggleState: 'summary',

    defaultType: 'rallybutton',
    items: [
        {
            itemId: 'detail',
            cls: 'toggle board rly-left',
            html: 'D',
            //iconCls: 'icon-board',
            frame: false,
            toolTipConfig: {
                html: 'Switch to Detail View',
                anchor: 'top',
                hideDelay: 0,
                constrainPosition: false/*,
                anchorOffset: 45,
                mouseOffset: [-45, 0]*/
            }
        },
        {
            itemId: 'summary',
            cls: 'toggle grid rly-right',
            html: 'S',
            //iconCls: 'icon-grid',
            frame: false,
            toolTipConfig: {
                html: 'Switch to Summary View',
                anchor: 'top',
                hideDelay: 0,
                constrainPosition: false/*,
                anchorOffset: 65,
                mouseOffset: [-65, 0]*/
            }
        }
    ],

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents([
            /**
             * @event toggle
             * Fires when the toggle value is changed.
             * @param {String} toggleState 'summary' or 'detail'.
             */
            'toggle'
        ]);

        this.items.each(function(item) {
            this.mon(item, 'click', this._onButtonClick, this);
        }, this);

        this.down('#' + this.toggleState).addCls(this.activeButtonCls);
    },

    _onButtonClick: function(btn) {
        var btnId = btn.getItemId();
        if (btnId !== this.toggleState) {
            this.toggleState = btnId;

            this.items.each(function(item) {
                if (item === btn) {
                    if (!item.hasCls(this.activeButtonCls.split(' ')[0])) {
                        item.addCls(this.activeButtonCls);
                    }
                } else {
                    item.removeCls(this.activeButtonCls);
                }
            }, this);

            this.fireEvent('toggle', this, this.toggleState);
        }
    }
});