sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.NewDoc", {
        onInit() {
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
            onCreate: function() {
            // Get the router
            var oRouter = this.getOwnerComponent().getRouter();
            // Navigate to PostOutgoing route
            oRouter.navTo("RoutePostOutgoing");
        }

    });
});