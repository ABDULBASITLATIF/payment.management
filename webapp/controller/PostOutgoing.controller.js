sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function(Controller) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.PostOutgoing", {
        
        onInit: function() {
            // Initialize your controller
        },

        onNavBack: function() {
            // Navigate back to the previous page
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteNewDoc");
        },

  
    });
});