Ext.define("TSBillingCodeImporter", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    billingCodeKeyPrefix: 'com.rallydev.technicalservices.billingcode',
    items: [
        {   
            xtype:'container',
            itemId:'summary_box', 
            tpl: 'Provide a comma-separated list of user names and billing codes'
        },
        {xtype:'container', defaults: { margin: 5 }, layout: { type: 'hbox' }, items: [
            {xtype:'container',itemId:'input_box'},
            {xtype:'rallybutton',text:'Submit',itemId:'submit_button'}
        ]},
        {xtype:'container', defaults: { margin: 5} , layout: { type: 'hbox' }, items: [
            {xtype:'container', itemId:'error_box', items: [{xtype:'container', html:'<b>Error Messages</b><br/>'}]},
            {xtype:'container', itemId:'message_box', items: [{xtype:'container',html:'<b>Informational Messages</b><br/>'}]}
        ]}
    ],
    
    config: {
        defaultSettings: {
            billingFieldName :  'NetworkID'
        }
    },

    
    launch: function() {
        var me = this;
        this.setLoading("Preparing App...");

        this._getUsers().then({
            scope: this,
            success: function(users) {
                this.setLoading(false);
                this.users = users;
                this._addTextArea(this.down('#input_box'));
                
                this.down('#submit_button').on('click',function() {
                    var values = this.down('#input_text_area').getValue();
                    this._processValues(values,users);
                }, this);
                
            },
            failure: function(error_message){
                Ext.Msg.alert(error_message);
            }
        }).always(function() {
            me.setLoading(false);
        });
    },
    
    _addTextArea: function(container) {
        var me = this;
        container.add({
            xtype:'textarea',
            itemId:'input_text_area', 
            width: 300, 
            height: 150,
            validator: function(value) {
                return me._validateInputText(value);
            },
            listeners: {
                scope: this,
                validitychange: function(box,isValid) {
                    this.down('#submit_button').setDisabled(!isValid);
                }
            }
        });
    },
    
    _validateInputText: function(value) {
        var rows = value.split('\n');
        var filtered_rows = Ext.Array.filter(rows, function(row) {
            var clean_row = row.replace(/\s/,'');
            return ( clean_row != '' );
        });
        
        if (!this._containsOnlyPairs(filtered_rows) ) {
            return "Entered data is not in pairs of user name and billing code";
        }

        if (!this._firstColumnAllUserNames(filtered_rows) ) {
            return "Entered data does not all start with user names";
        }
        
        return true;
    },
    
    _firstColumnAllUserNames: function(rows) {
        var valid = true;
        Ext.Array.each(rows, function(row){
            var a = row.split(',');
            if (!/\@/.test(a[0]) ) {
                valid = false;
            }
        });
        return valid;
    },
    
    _containsOnlyPairs: function(rows) {
        var contains_only_pairs = true;
        Ext.Array.each(rows, function(row){
            var a = row.split(',');
            if ( a.length != 2 ) { contains_only_pairs = false; }
        });
        return contains_only_pairs;
    },
    
    _getUsers: function() {
        var model_name = 'User',
            field_names = ['UserName','FirstName','LastName','ObjectID',this.getSetting('billingFieldName')],
            filters = [{property:'Disabled', value: false}];
            sorters = [{property:'UserName'}];
        
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
    
    /*
     * given a set of username/code pairs and
     * rally users, update the appropriate rally user with
     * the data
     * 
     */
    _processValues: function(value,users) {
        var me = this;
        var rows = value.split('\n');
        var filtered_rows = Ext.Array.filter(rows, function(row) {
            var clean_row = row.replace(/\s/,'');
            return ( clean_row != '' );
        });
        
        var billing_arrays = Ext.Array.map(filtered_rows, function(row){
            return row.split(',');
        });
        
        var user_hash = this._getItemHashByField(users,'UserName');
        
        var promises = [];
        
        var total_count = billing_arrays.length;
        var input_box = this.down('#input_box');

        Ext.Array.each(billing_arrays, function(billing_array,idx){
            var user_name = Ext.String.trim(billing_array[0]);
            var billing_code = Ext.String.trim(billing_array[1]);
            
            if ( Ext.isEmpty(user_hash[user_name]) ){
                this.down('#error_box').add({xtype:'container', html:'Cannot find user: ' + user_name});
            } else {
                promises.push(function() { 
                    input_box.setLoading('Processing ' + idx + ' of ' + total_count);
                    return me._setBillingForUser(billing_code,user_hash[user_name]); 
                });
            }
        },this)
        
        if ( promises.length === 0 ) {
            input_box.setLoading(false);
        } else {
            Deft.Chain.sequence(promises).then({
                scope: this,
                failure: function(error_message) {
                    Ext.Msg.alert(error_message);
                }
            }).always(function(){
                input_box.setLoading(false)
            });
        }
    },

    _getItemHashByField: function(items,field_name){
        var item_hash = {};
        Ext.Array.each(items, function(item){
            item_hash[item.get(field_name)] = item;
        });
        return item_hash;
    },
    
    _setBillingForUser: function(billing_code, user){
        var deferred = Ext.create('Deft.Deferred');
        var code_field = this.getSetting('billingFieldName');
        
        var old_code = user.get(code_field);
        var user_name = user.get('UserName');
        
        var message_box = this.down('#message_box');
        var error_box = this.down('#error_box');
        
        message_box.add({
            xtype:'container',
            html:user_name + ": Change billing code from '" + old_code + "' to '" + billing_code + "'"
        });
        
        user.set(code_field,billing_code);
        user.save({
            callback: function(result, operation) {
                if ( operation.error && operation.error.errors.length > 0 ) {
                    message_box.add({
                        xtype:'container',
                        html: user_name + ' failed to save: ' + operation.error.errors[0]
                    });
                } else {
                    message_box.add({
                        xtype:'container',
                        html: '...Success!'
                    });
                    user = result;
                }
                deferred.resolve(result);
            }
        });
        return deferred.promise;
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
    