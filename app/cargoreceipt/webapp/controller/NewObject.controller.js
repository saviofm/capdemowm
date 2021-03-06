sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/newObject",    
    "sap/m/ColumnListItem",
	"sap/m/Label",
	"sap/m/Token",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/ui/core/Core",
	"sap/ui/core/library",
    "../model/formatter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/Device",
    "sap/ui/core/syncStyleClass"
], function (BaseController,
	JSONModel,
	History,
	NewObject,
	ColumnListItem,
	Label,
	Token,
	Fragment,
    Filter,
    FilterOperator,
	Core,
	library,
	Formatter,
    MessageToast,
    MessageBox,
    Device,
    syncStyleClass) {
    "use strict";
    var ValueState = library.ValueState;
    return BaseController.extend("capdemowm.app.cargoreceipt.controller.NewObject", {

        formatter: Formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        /**
         * @override
         */
        onInit : function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            let oViewModel = new JSONModel({
                    busy : true,
                    delay : 0
                });
            //let bIsPhone = Device.system.phone;

            let oViewModelAux = new JSONModel({
                    imageHeight: "10em",
                    imageWidth:  "10em",
                    imageBackgroundSize: "2em",
                    natureza: []
                });

            this.getRouter().getRoute("newObject").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "newObjectView");
            this.getView().setModel(oViewModelAux, "objectViewAux");
        },

        onAfterRendering: function() {
            // Reset the scan result
            var oScanButton = this.getView().byId('BarcodeScannerButton');
            if (oScanButton) {
                $(oScanButton.getDomRef()).on("click", function(){
                    //oScanResultText.setText('');
                    this.getModel("newObjectView").setProperty("/barcode", "");
                    //this.getView().byId("barcodeInput").setValue('');
                }.bind(this));
            }
        },


        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */


        /**
         * Event handler  for navigating back.
         * It there is a history entry wime go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack : function() {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("worklist", {}, true);
            }
        },
        onValidationFields: function(oEvent){
            let aFieldClass = ["awb", "position", "uld", "pesoBruto", "pesoLiquido", "volume"],
                oModel      = this.getModel("newObjectView").getData(),
                bValid      = true;

            aFieldClass.forEach(sField =>{
                if(oModel[sField] === "" || oModel[sField] === false || oModel[sField] === null){
                    oModel.State[sField].ValueState     = sap.ui.core.ValueState.Error;
                    oModel.State[sField].ValueStateText = this.getResourceBundle().getText("validationRequiredField");
                    bValid = false;
                } else {
                    oModel.State[sField].ValueState     = sap.ui.core.ValueState.None;
                    oModel.State[sField].ValueStateText = "";
                }
            });

            if(!bValid){
                oModel.State.buttonSave.Enabled = false;
            }else{
                oModel.State.buttonSave.Enabled = true;
            }

            this.getModel("newObjectView").refresh(true);
        },

        onChangeCamera: function(oEvent){
            //oFileUploader = oEvent.getSource();

            var afile = oEvent.getParameters().files[0];


            var reader = new FileReader();

            reader.onerror = function (e) {
                //MessageToast.show(oResourceBundle.getText("uploadError"), { duration:1000 });
                console.log(e);
            }.bind(this);

            reader.onloadend = function() {
                this.getModel("newObjectView").setProperty("/image", reader.result); 
            }.bind(this);

            reader.readAsDataURL(afile);
            //oFileUploader.upload();


            /*
            var vTicket = path
            var aFiles=oEvt.getParameters().files;
            var currentFile = aFiles[0];
            oView.getController().resizeAndUpload(currentFile,{
                    success:function(oEvt){
                        oFileUploader.setValue("");
                        //Here the image is on the backend, so i call it again and set the image
                    },
                    error:function(oEvt){
                       ..........
                    }
                });
                */

        },

            //onUploadCompleted(oEvent){
            //    console.log(oEvent);
            //},
            
        onScanSuccess: function(oEvent) {
            var oResourceBundle = this.getResourceBundle();
            if (oEvent.getParameter("cancelled")) {
                MessageToast.show(oResourceBundle.getText("scanCancelled"), { duration:1000 });
            } else {
                if (oEvent.getParameter("text")) {         
                    this.getModel("newObjectView").setProperty("/barcode", oEvent.getParameter("text"));

                  
                } else {
                    this.getModel("newObjectView").setProperty("/barcode", "");
                  
                    
                }
            }
        },

        onScanError: function(oEvent) {
            var oResourceBundle = this.getResourceBundle();
            MessageToast.show(oResourceBundle.getText("scanFailed") + oEvent, { duration:1000 });
        },

        onScanLiveupdate: function(oEvent) {
            // User can implement the validation about inputting value
        },

        handleDateChange: function (oEvent) {
			var 
				oDP = oEvent.getSource(),	
				bValid = oEvent.getParameter("valid");

			
			if (bValid) {
				oDP.setValueState(ValueState.None);
			} else {
				oDP.setValueState(ValueState.Error);
			}
		},

        onPress: function(oEvent){
            this.setAppBusy(true);

            let oParcel = oEvent.getParameter("selectedItem").getBindingContext().getObject();

            let sKeyParcel = this.getModel().createKey("/Parcel", {
                ID: oParcel.ID
            });

            this.getView().getModel().read(sKeyParcel, {
                urlParameters:{ 
                    "$expand": 'origemAwb,destinoAwb,origemHawb,destinoHawb,airline,declaracao,natureza',
                },
                success: function(oData){
                    this.setAppBusy(false);
                    console.log(oData);
                    this._moveParcelFields(oData);
                }.bind(this),
                error: function(oError){
                    this.setAppBusy(false);
                    console.log(oError);
                }.bind(this)
            });
        },

        handleSearch: function(oEvent){
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("value");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = new Filter({
                        and: false,
                        filters: [
                            new Filter("awb",     FilterOperator.Contains, sQuery),
                            new Filter("transDoc",      FilterOperator.Contains, sQuery),
                            new Filter("airline/airlineCode",     FilterOperator.Contains, sQuery),
                            new Filter("origemAwb/iata", FilterOperator.Contains, sQuery),
                            new Filter("destinoAwb/iata", FilterOperator.Contains, sQuery),
                            new Filter("ncm",      FilterOperator.Contains, sQuery),
                            new Filter("package/packageDescription",      FilterOperator.Contains, sQuery),
                        ]
                    })
                }
                this._applySearch(aTableSearchState);
            }
        },

        handleClose: function(oEvent){
            let oBinding = this.byId("myDialog").getBinding("items");

			oBinding.filter([]);

			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				//MessageToast.show("You have chosen " + aContexts.map(function (oContext) { return oContext.getObject().Name; }).join(", "));
			}
        },

        onGetWeight: function(oEvent){
            // load BusyDialog fragment asynchronously
			if (!this._pBusyDialog) {
				this._pBusyDialog = Fragment.load({
                    id: this.getView().getId(),
					name: "capdemowm.app.cargoreceipt.view.fragment.BusyDialog",
					controller: this
				}).then(
                    function (oBusyDialog) {
                        this.getView().addDependent(oBusyDialog);
                        syncStyleClass("sapUiSizeCompact", this.getView(), oBusyDialog);
                        return oBusyDialog
                       
				}.bind(this));
			}

            this._pBusyDialog.then(function(oBusyDialog) {
				oBusyDialog.open();
                this._getWeight();
			}.bind(this));
            

        },


        onPressSave: function(oEvent){
            this.setAppBusy(true);

            let oModel              = this.getModel("newObjectView").getData(),
                oObjectCargoReceipt = this._createObjectCargoReceipt(oModel);
            
            this.getModel().create("/CargoReceipt", oObjectCargoReceipt, {
                success: function(oData){

                    MessageToast.show(this.getResourceBundle().getText("messageSuccessCreateCargoReceipt"), {duration: 3000, closeOnBrowserNavigation: false});
                    this.getRouter().navTo("worklist");

                    this.getModel().refresh(true);
                    
                    this.setAppBusy(false);
                }.bind(this),
                error: function(oError){
                    MessageBox.error(this.getResourceBundle().getText("messageErrorCreateCargoReceipt"));

                    this.setAppBusy(false);
                }.bind(this)
            });
        },

        onDialogClosed: function (oEvent) {
            /*this._pBusyDialog.then(function(oBusyDialog) {
                oBusyDialog.close();
            });*/

            this._pBusyDialog.close();
            /*
			if (oEvent.getParameter("cancelPressed")) {
				MessageToast.show("The operation has been cancelled");
			} else {
				MessageToast.show("The operation has been completed");
			}
            */
		},

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: async function (oEvent) {
            this.getModel("newObjectView").setData(NewObject.initModel());
            this.getModel("newObjectView").refresh(true);

            if(!this._pDialog) {
				this._pDialog = await Fragment.load({
					id: this.getView().getId(),
					name: "capdemowm.app.cargoreceipt.view.fragment.Dialog",
					controller: this
				}).then(
                    function(oDialog){
                        this.getView().addDependent(oDialog);
                        oDialog.open();

                        return oDialog
				    }.bind(this)
                );
            }else{
                this._pDialog.open();
            }
        },

        _getWeight: function () {

            this.getView().getModel().callFunction("/getWeight", {    // function import name
                method: "GET",                             // http method
                //urlParameters: {"parameter1" : "value1"  }, // function import parameters        
                success: function(oData, response) { 
                    this.getModel("newObjectView").setProperty("/pesoBruto", response.data.getWeight.pesoBruto); 
                    this.getModel("newObjectView").setProperty("/pesoLiquido", response.data.getWeight.pesoLiquido); 
                    this.getModel("newObjectView").setProperty("/tara", response.data.getWeight.tara); 
                    this.onValidationFields();
                    this._pBusyDialog.then(function(oBusyDialog) {
                        oBusyDialog.close();
                    });
                }.bind(this),      // callback function for success
                error: function(oError){ 
                    this._pBusyDialog.then(function(oBusyDialog) {
                        oBusyDialog.close();
                    });
                }.bind(this)                  // callback function for error
            });
            
		},

        _moveParcelFields: function(oData) {
            let Model = this.getModel("newObjectView");
            Model.setProperty("/preParcel", oData.ID);
            Model.setProperty("/State/awb/Enabled", false);
            Model.setProperty("/awb", oData.awb);
            Model.setProperty("/hawb", oData.hawb);
            Model.setProperty("/ruc", oData.ruc);
            //Model.setProperty("/position", oData.position);
            Model.setProperty("/declaracaoNr", oData.declaracaoNr);
            Model.setProperty("/transit", oData.transit);
            Model.setProperty("/express", oData.express);
            Model.setProperty("/dseManual", oData.dseManual);
            if (oData.volume){
                Model.setProperty("/volume", oData.volume);
            }
            Model.setProperty("/pesoBruto", oData.pesoBruto);
            Model.setProperty("/ncm", oData.ncm);
            Model.setProperty("/declaracao", oData.declaracao.declaracao);
            Model.setProperty("/origemAwb", oData.origemAwb.ID);
            Model.setProperty("/destinoAwb", oData.destinoAwb.ID);
            Model.setProperty("/origemHawb", oData.origemHawb.ID);
            Model.setProperty("/destinoHawb", oData.destinoHawb.ID);
            Model.setProperty("/airline", oData.airline.ID);

            //Natureza
            var aNaturezaBinding = [];
            if (oData.natureza && oData.natureza.results ){
                for (let natureza of oData.natureza.results){
                    aNaturezaBinding.push(natureza.natureza_ID);
                }
            }
            Model.setProperty("/natureza", aNaturezaBinding);
        },

        _createObjectCargoReceipt: function(sModel){
            let Model = {
                awb: this._clearFormatting(sModel.awb),
                hawb: this._clearFormatting(sModel.hawb),     
                ruc:  sModel.ruc,
                uld:  sModel.uld,
                declaracaoNr: sModel.declaracaoNr,
                transit: sModel.transit,
                express: sModel.express,
                manualCargo: sModel.manualCargo,
                dseManual: sModel.dseManual,            
                volume: sModel.volume,   
                bagDesacomp: sModel.bagDesacomp,
                position: sModel.position,
                ncm: this._clearFormatting(sModel.ncm),
                image: sModel.image,
                barcode: sModel.barcode
            
            }
            if (sModel.preParcel)       Model.preParcel     = { ID: sModel.preParcel };
            if (sModel.pesoBruto)       Model.pesoBruto     = this._clearFormatting(Formatter.numberUnit(sModel.pesoBruto));
            if (sModel.pesoLiquido)     Model.pesoLiquido   = this._clearFormatting(Formatter.numberUnit(sModel.pesoLiquido));
            if (sModel.tara)            Model.tara   = this._clearFormatting(Formatter.numberUnit(sModel.tara));
            if (sModel.declaracao)      Model.declaracao    = { declaracao: sModel.declaracao };
            if (sModel.origemAwb)       Model.origemAwb     = { ID: sModel.origemAwb };
            if (sModel.destinoAwb)      Model.destinoAwb    = { ID: sModel.destinoAwb };
            if (sModel.origemHawb)      Model.origemHawb    = { ID: sModel.origemHawb };
            if (sModel.destinoHawb)     Model.destinoHawb   = { ID: sModel.destinoHawb };
            if (sModel.airline)         Model.airline       = { ID: sModel.airline };
   
     


            let aNatureza = [];
            for (let i = 0; i < sModel.natureza.length; i++) {
                if (sModel.natureza[i] != "") aNatureza.push({ natureza: { ID: sModel.natureza[i] }}); 
            }

            if (sModel.natureza.length != 0) Model.natureza = aNatureza;
            


            return Model; 

        },

        _clearFormatting: function(sValue){
            return sValue.replaceAll(".", "")
                         .replace(",", "")
                         .replace("-", "");
        },

        _applySearch: function(aTableSearchState) {
            let oTable     = this.byId("myDialog"),
                oViewModel = this.getModel("newObjectView");

            oTable.getBinding("items").filter(aTableSearchState, "Application");

            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
            }
        }
    });
    
});

