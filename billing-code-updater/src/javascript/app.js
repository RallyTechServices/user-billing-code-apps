Ext.define("TSBillCodeUpdater", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    billingCodeKeyPrefix: 'com.rallydev.technicalservices.billingcode',
    items: [
        {   
            xtype:'container',
            itemId:'summary_box', 
            tpl: '<tpl>{filtered} users currently do not have a billing code out of {total}</tpl>'
        },
        {xtype:'container',itemId:'grid_box'}
    ],
    
    config: {
        defaultSettings: {
            billingFieldName :  'NetworkID'
        }
    },

    
    launch: function() {
        var me = this;
        this.setLoading("Loading users...");
        
        Deft.Promise.all([
             this._getUserStore()//,
             /* in case we change over to prefs */
//             this._getUsers(),
//             this._getBillingCodes() 
        ]).then({
            scope: this,
            success: function(results) {
                var user_store = results[0];
                //var codes = results[1];
                //var store = this._sortDataIntoStore(users,codes);
                //this.down('#summary_box').update();
                var me = this;
                var all_user_count = user_store.totalCount;
                
                // filter second so we can get a count before we update the grid
                user_store.on('load', function(store) {
                    var filtered_user_count = store.totalCount;
                    me.down('#summary_box').update({'total':all_user_count, 'filtered': filtered_user_count});
                    
                    me._displayGrid(store); 
                    
                },{scope: this, single: true});
                
                user_store.addFilter( {property:me.getSetting('billingFieldName'), operator: '=', value: '' }, true);
            },
            failure: function(error_message){
                alert(error_message);
            }
        }).always(function() {
            me.setLoading(false);
        });
    },
    
    _getUsers: function() {
        var model_name = 'User',
            field_names = ['UserName','FirstName','LastName','ObjectID',this.getSetting('billingFieldName')],
            sorters = [{property:'UserName'}];
        
        return this._loadRecordsWithAPromise(model_name, field_names, [], sorters);
    },
    
    _getUserStore: function() {
        var model_name = 'User',
            field_names = ['UserName','FirstName','LastName','ObjectID',this.getSetting('billingFieldName')],
            filters = [{property:'Disabled', value: false}];
            sorters = [{property:'UserName'}];
        
        return this._loadStoreWithAPromise(model_name, field_names, filters, sorters);
    },
    
    _getBillingCodes: function() {
        var model_name = 'Preference',
            field_names = ['Name','Value','ObjectID'],
            filters = [{property:'Name',operator:'contains', value: this.billingCodeKeyPrefix}];
        
        return this._loadRecordsWithAPromise(model_name, field_names, filters,[]);
    },
    
    _sortDataIntoStore: function(users,codes) {
        
        var user_data = Ext.Array.map(users,function(user){
            return user.getData();
        });
        
        return Ext.create('Rally.data.custom.Store', {
            data: user_data
        });
    },
    
    _loadRecordsWithAPromise: function(model_name, model_fields, filters, sorters){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Starting load:",model_name,model_fields);
          
        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields,
            sorters: sorters,
            filters: filters
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
            filters: filters
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
    
    _displayGrid: function(store){
        var container = this.down('#grid_box');
        container.removeAll();
        container.add({
            xtype: 'rallygrid',
            store: store,
            showRowActionsColumn: false,
            columnCfgs: this._getColumns()
        });
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
