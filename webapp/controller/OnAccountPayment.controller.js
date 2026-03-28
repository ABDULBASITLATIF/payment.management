sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../modules/InputHelpsOA"
], (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast,InputHelpsOA) => {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.OnAccountPayment", {
       InputHelpsOA: InputHelpsOA,
       
        onInit: function() {
            
        },
        onNavBack: function() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteNewDoc");
        },
 
    });
});