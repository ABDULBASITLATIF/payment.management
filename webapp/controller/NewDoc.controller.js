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
        onInit() {
            // Initialize JSON model for the table
            var oJsonModel = new JSONModel();
            this.getView().setModel(oJsonModel, "headModel");

            // Load data from OData service
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
            var sDraftType = this.byId("filterDraftType").getSelectedKey();

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
            this.byId("filterDraftType").setSelectedKey("");

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
        // onCreate: async function (oEvent) {

        //     var oView = this.getView();

        //     if (!this._pTablePostingDialog) {
        //         this._pTablePostingDialog = sap.ui.core.Fragment.load({
        //             id: oView.getId(),
        //             name: "zfi.payment.management.fragments.Create",
        //             controller: this
        //         }).then(function (oDialog) {
        //             oView.addDependent(oDialog);
        //             return oDialog;
        //         });
        //     }

        //     var oDialogTP = await this._pTablePostingDialog;
        //     oDialogTP.open();

        // },
        // onCloseCreateDialog() {

        //     if (this._pTablePostingDialog) {
        //         this._pTablePostingDialog.then(function (oDialog) {
        //             oDialog.close();
        //         });
        //     }
        // },
        onCreate: function () {
            // Get the router
            var oRouter = this.getOwnerComponent().getRouter();
            // Navigate to PostOutgoing route
            oRouter.navTo("RoutePostOutgoing");
        }

    });
});