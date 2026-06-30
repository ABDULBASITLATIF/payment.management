sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator"
], function (MessageToast, Filter, Fragment, FilterOperator) {
    "use strict";
    return {
        // validCompCode(oComp,oModel){
        validCompCode(oEvent){
            var compCodeFld = oEvent.getSource();
            var compCodeVal = compCodeFld.getValue();
            this.getOwnerComponent().getModel().read("/I_CompanyCode",{
                filters:[new Filter("CompanyCode", FilterOperator.EQ, compCodeVal)],
                success(oData){
                    if (oData.results.length < 1){
                        // var modelData = oModel.getData();
                        // modelData.state.compCode = 'Error';
                        // oModel.setData(modelData);
                        compCodeFld.setValueState("Error");
                    }
                    else{
                        // var modelData = oModel.getData();
                        // modelData.state.compCode = 'None';
                        // oModel.setData(modelData);
                        compCodeFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });
        },
        validBankID(oEvent){

        },
        validBnkAcc(oEvent){
            
        },
        validBankGL(oEvent){

        },
        validGL(oEvent){

        },
        validCostCenter(oEvent){

        },
        validProfitCenter(oEvent){

        },
        validWBS(oEvent){
            
        }
    };
});


                    // "state":{"draftID":"None","compCode":"",
                    // "docDate":"","postDate":"","refer":"","headText":"","bankID":"","bankAcc":"",
                    // "bankGL":"","curr":"","payAmnt":"","debit":"","credit":"","balance":""