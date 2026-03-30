sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) => {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.NewDoc", {
       onInit: function() {
    var oJsonModel = new JSONModel();
    this.getView().setModel(oJsonModel, "headModel");

    // Attach route matched to reload data every time user navigates back
    var oRouter = this.getOwnerComponent().getRouter();
    oRouter.getRoute("RouteNewDoc").attachMatched(this._onRouteMatched, this);
},

_onRouteMatched: function() {
    this._loadHeadData();
},

        _loadHeadData: function () {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel(); // OData model
            var that = this;

            // Show busy indicator
            oView.setBusy(true);

            // Read data from head entity set
            oModel.read("/head", {
                success: function (oData) {
                    // Set data to JSON model
                    var oJsonModel = oView.getModel("headModel");
                    
                    oJsonModel.setData(oData.results);
                    oView.setBusy(false);
                },
                error: function (oError) {
                    oView.setBusy(false);
                    sap.m.MessageBox.error("Failed to load data: " + oError.message);
                }
            });
        },
        onFilterChange: function () {
            // Apply filters based on filter bar values
            this._applyFilters();
        },

        _applyFilters: function () {
            var oTable = this.byId("table");
            var oBinding = oTable.getBinding("items");

            if (!oBinding) {
                MessageToast.show("No data to filter");
                return;
            }

            var aFilters = [];

            // Get filter values
            var sDraftId = this.byId("filterDraftId").getValue().trim();
            var sFiscYear = this.byId("filterFiscYear").getValue().trim();
            var oPostingDate = this.byId("filterPostingDate").getDateValue();
            var sDraftType   = this.byId("filterDrafttype").getSelectedKey();
            var sDraftStatus = this.byId("filterDraftStatus").getSelectedKey();

            // Build filters array
            if (sDraftId) {
                aFilters.push(new Filter("draftId", FilterOperator.Contains, sDraftId));
            }

            if (sFiscYear) {
                aFilters.push(new Filter("fiscYear", FilterOperator.Contains, sFiscYear));
            }

            if (oPostingDate) {
                // Create a filter function for date comparison
                aFilters.push(new Filter({
                    path: "postingDate",
                    test: function (oValue) {
                        if (!oValue) return false;
                        var oItemDate = new Date(oValue);
                        return oItemDate.getFullYear() === oPostingDate.getFullYear() &&
                            oItemDate.getMonth() === oPostingDate.getMonth() &&
                            oItemDate.getDate() === oPostingDate.getDate();
                    }
                }));
            }

           if (sDraftType) {
              aFilters.push(new Filter("draftType", FilterOperator.EQ, sDraftType));
            }

           if (sDraftStatus) {
               aFilters.push(new Filter("draftSt", FilterOperator.EQ, sDraftStatus));
           }

            // Apply filters to the table binding
            oBinding.filter(aFilters, "Application");

            // Show message
            var iFilteredCount = oBinding.getLength();
            MessageToast.show("Filtered: " + iFilteredCount + " records found");
        },

        _formatDateForOData: function (oDate) {
            // Format date as YYYY-MM-DD for OData
            var sYear = oDate.getFullYear();
            var sMonth = String(oDate.getMonth() + 1).padStart(2, '0');
            var sDay = String(oDate.getDate()).padStart(2, '0');
            return sYear + '-' + sMonth + '-' + sDay;
        },

        onClearFilters: function () {
            // Clear all filter inputs
            this.byId("filterDraftId").setValue("");
            this.byId("filterFiscYear").setValue("");
            this.byId("filterPostingDate").setValue("");
            this.byId("filterDrafttype").setSelectedKey("");
            this.byId("filterDraftStatus").setSelectedKey("");

            // Clear filters from table binding
            var oTable = this.byId("table");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.filter([], "Application");
                MessageToast.show("Filters cleared - showing all " + oBinding.getLength() + " records");
            }
        },

        onSelectionChange: function (oEvent) {
            var aSelectedItems = this.byId("table").getSelectedItems();
            console.log("Selected items count: " + aSelectedItems.length);

            // You can access selected data like this:
            aSelectedItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext("headModel");
                var oData = oContext.getObject();
                console.log("Selected Draft ID: " + oData.draftId);
            });
        },
       onCreate: async function () {
            var oView = this.getView();

            // Initialize a local model for the dialog selection
            if (!oView.getModel("createModel")) {
                oView.setModel(new JSONModel({ selectedView: "" }), "createModel");
            } else {
                oView.getModel("createModel").setProperty("/selectedView", "");
            }

            if (!this._pTablePostingDialog) {
                this._pTablePostingDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "zfi.payment.management.fragments.Create",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            var oDialog = await this._pTablePostingDialog;
            oDialog.setModel(oView.getModel("createModel"));
            oDialog.open();
        },

        onGoCreate: function () {
            var sSelectedKey = this.getView().getModel("createModel").getProperty("/selectedView");
            var oRouter = this.getOwnerComponent().getRouter();

            if (!sSelectedKey) {
                MessageToast.show("Please select a payment type.");
                return;
            }

            this.onCloseCreateDialog();

            switch (sSelectedKey) {
                case "v1":
                    oRouter.navTo("RoutePostOutgoing", { draftId: "new" });
                    break;
                case "v2":
                    oRouter.navTo("RouteDownPayment", { draftId: "new" });
                    break;
                case "v3":
                    oRouter.navTo("RouteOnAccountPayment", { draftId: "new" });
                    break;
                default:
                    MessageToast.show("Please select a payment type.");
            }
        },
        onCloseCreateDialog() {

            if (this._pTablePostingDialog) {
                this._pTablePostingDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },
//    onCreate: function () {
//     var oRouter = this.getOwnerComponent().getRouter();
//     oRouter.navTo("RoutePostOutgoing", {});
// },

// onEditDraft: function (oEvent) {
//     var oItem = oEvent.getSource();
//     var oContext = oItem.getBindingContext("headModel");
//     var sDraftId = oContext.getProperty("draftId");
//     var oRouter = this.getOwnerComponent().getRouter();
//     oRouter.navTo("RoutePostOutgoing", { draftId: sDraftId });
// },
onEditDraft: function (oEvent) {
    var oItem = oEvent.getSource();
    var oContext = oItem.getBindingContext("headModel");
    var sDraftId = oContext.getProperty("draftId");
    var sDraftType = oContext.getProperty("draftType"); // Get draftType from row
    var oRouter = this.getOwnerComponent().getRouter();

    switch (sDraftType) {
        case "1":
            oRouter.navTo("RoutePostOutgoing", { draftId: sDraftId });
            break;
        case "2":
            oRouter.navTo("RouteDownPayment", { draftId: sDraftId });
            break;
        case "3":
            oRouter.navTo("RouteOnAccountPayment", { draftId: sDraftId });
            break;
        default:
            MessageToast.show("Unknown draft type: " + sDraftType);
    }
},

    });
});