Ext.define("TSBillingCodeReport", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    billingCodeKeyPrefix: 'com.rallydev.technicalservices.billingcode',
    items: [
        {
            xtype:'container',
            itemId:'selector_box'
        },
        {   
            xtype:'container',
            itemId:'summary_box',
            toggleable: true,
            hidden: false
        },
        {
            xtype:'container',
            itemId:'detail_box',
            toggleable: true,
            hidden: true
        }
    ],
    
    config: {
        defaultSettings: {
            billingFieldName :  'NetworkID'
        }
    },

    
    launch: function() {
        var me = this;
        this.setLoading("Loading users...");
        
        var billing_field_name = this.getSetting('billingFieldName');
        
        this._getUsers().then({
            scope: this,
            success: function(users) {
                this._addToggle(this.down('#selector_box'));
                
                var users_by_code = this._getUsersByCode(users);
                var summary_data = this._getSummaryData(users_by_code);
                this._addSummaryGrid(this.down('#summary_box'), summary_data);
                
                this._addDetailGrid(this.down('#detail_box'), users_by_code);
            },
            failure: function(error_message){
                alert(error_message);
            }
        }).always(function() {
            me.setLoading(false);
        });
    },
    
    _getUsersByCode: function(users) {
        var billing_field_name = this.getSetting('billingFieldName');
        
        var users_by_code = {};
        
        Ext.Array.each(users, function(user){
            var code = user.get(billing_field_name);
            
            if ( !users_by_code[code] ) {
                users_by_code[code] = [];
            }
            
            users_by_code[code].push(user);
        });
        
        return users_by_code;
    },
    
    _addToggle: function(container) {
        container.add({
            xtype:'tstoggle',
            listeners: {
                scope: this,
                toggle: function(toggle, new_state) {
                    Ext.Array.each( this.query('{toggleable}'),function(box){
                        box.hide(true);
                    });
                    
                    this.down('#' + new_state + '_box').show(false);
                }
            }
        });
    },
    
    _getSummaryData: function(users_by_code){
        var data = [];
        Ext.Object.each(users_by_code, function(code,users){
            data.push({ 'code': code, 'count': users.length });
        });
        return data;
    },
    
    _addSummaryGrid: function(container, data){
        var store = Ext.create('Rally.data.custom.Store',{data:data});
        
        container.add({
            xtype:'rallygrid',
            store: store,
            showPagingToolbar: false,
            columnCfgs: [
                { text: 'Billing Code', dataIndex: 'code', width: 150 },
                { text: 'Total Rally Users', dataIndex: 'count', width: 150 }
            ]
        });
    },
    
    _addDetailGrid: function(container, data){
        Ext.Object.each(data, function(code,users){
            container.add({
                xtype:'container',
                margin: '15 5 5 5',
                tpl:'<tpl>Number of users for billing code {code}: {count}</tpl>'}
            ).update({'code':code,'count':users.length});
            
            var store = Ext.create('Rally.data.custom.Store',{
                data:users,
                pageSize: 5000,
                limit:5000
            });
        
            container.add({
                xtype:'rallygrid',
                margin: 5,
                store: store,
                showPagingToolbar: false,
                showRowActionsColumn: false,
                columnCfgs: [
                    { text: 'User', dataIndex: '_refObjectName', width: 150 },
                    { text: 'Email Address', dataIndex: 'UserName', width: 200 }
                ]
            });
        });

    },

    _getUsers: function() {
        var me = this;
        
        var model_name = 'User',
            field_names = ['UserName','FirstName','LastName','ObjectID',this.getSetting('billingFieldName')],
            sorters = [{property:'LastName'}],
            filters = [
                {property:me.getSetting('billingFieldName'), operator: '!=', value: '' },
                {property:'Disabled', operator: '!=', value: true}
            ];
        
        return this._loadRecordsWithAPromise(model_name, field_names, filters, sorters);
    },
    
    _loadRecordsWithAPromise: function(model_name, model_fields, filters, sorters){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Starting load:",model_name,model_fields);
          
        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields,
            sorters: sorters,
            filters: filters,
            limit: 'Infinity'
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _loadStoreWithAPromise: function(model_name, model_fields, filters, sorters){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Starting load:",model_name,model_fields);
          
        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields,
            sorters: sorters,
            filters: filters,
            limit: 'Infinity'
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(this);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _getColumns: function() {
        return [
            {dataIndex: 'UserName', text:'id'},
            {dataIndex: 'FirstName', text:'First Name'},
            {dataIndex: 'LastName',text:'Last Name'},
            {dataIndex: this.getSetting('billingFieldName'), text:'Billing Code'}
        ];
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    getSettingsFields: function() {
        return [{
            name: 'billingFieldName',
            xtype: 'rallyfieldcombobox',
            model: Ext.identityFn('User'),
            fieldLabel: 'Billing Field:',
            margin: '10 0 0 0',
            readyEvent: 'ready',
            _isNotHidden: function(field) {
                if ( field.hidden  ) {
                    return false;
                }
                
                var attr = field.attributeDefinition;
                if ( attr.ReadOnly) {
                    return false;
                }
                                
                return ( /* attr.Custom && */
                    !_.contains(['web_link', 'text', 'date', 'boolean'], attr.AttributeType.toLowerCase()) );
            }
        }];
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this.launch();
    }
});
