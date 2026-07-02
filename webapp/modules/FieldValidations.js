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
            debugger;
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
            debugger;
            var bankIDFld = oEvent.getSource();
            var bankIDVal = bankIDFld.getValue();
            var modelData = bankIDFld.mBindingInfos.value.binding.oModel.getData();
            this.getOwnerComponent().getModel().read("/I_Housebank",{
                filters:[new Filter("HouseBank", FilterOperator.EQ, bankIDVal),
                        new Filter("CompanyCode",FilterOperator.EQ,modelData.values.compCode)
                    ],
                success(oData){
                    if (oData.results.length < 1){
                        bankIDFld.setValueState("Error");
                    }
                    else{
                        bankIDFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });            

        },
        validBnkAcc(oEvent){
            var bankAccFld = oEvent.getSource();
            var bankAccVal = bankAccFld.getValue();
            var modelData = bankAccFld.mBindingInfos.value.binding.oModel.getData();
            this.getOwnerComponent().getModel().read("/I_HouseBankAccountVH",{
                filters:[new Filter("HouseBankAccount",FilterOperator.EQ,bankAccVal),
                        new Filter("HouseBank", FilterOperator.EQ, modelData.values.bankID),
                        new Filter("CompanyCode",FilterOperator.EQ,modelData.values.compCode)
                    ],
                success(oData){
                    if (oData.results.length < 1){
                        bankAccFld.setValueState("Error");
                    }
                    else{
                        bankAccFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });            
            
        },
        validBankGL(oEvent){
            var bankGLFld = oEvent.getSource();
            var bankGLVal = bankGLFld.getValue();
            var modelData = bankGLFld.mBindingInfos.value.binding.oModel.getData();
            this.getOwnerComponent().getModel().read("/bankGLS",{
                
                filters:[new Filter("GLAccount",FilterOperator.EQ,bankGLVal),,
                        new Filter("HouseBankAccount",FilterOperator.EQ,modelData.values.bankAcc),
                        new Filter("HouseBank", FilterOperator.EQ, modelData.values.bankID),
                        new Filter("CompanyCode",FilterOperator.EQ,modelData.values.compCode)
                    ],
                success(oData){
                    if (oData.results.length < 1){
                        bankGLFld.setValueState("Error");
                    }
                    else{
                        bankGLFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });          

        },
        validGL(oEvent){
            var glFld = oEvent.getSource();
            var glVal = glFld.getValue();
            this.getOwnerComponent().getModel().read("/GLAccVH",{
                filters:[new Filter("GLAccount",FilterOperator.EQ,glVal)],
                success(oData){
                    if (oData.results.length < 1){
                        glFld.setValueState("Error");
                    }
                    else{
                        glFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });            

        },
        validCostCenter(oEvent){
            var costCntrFld = oEvent.getSource();
            var costCntrVal = costCntrFld.getValue();
            this.getOwnerComponent().getModel().read("/costCenterVH",{
                filters:[new Filter("CostCenter",FilterOperator.EQ,costCntrVal)],
                success(oData){
                    if (oData.results.length < 1){
                        costCntrFld.setValueState("Error");
                    }
                    else{
                        costCntrFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });            


        },
        validProfitCenter(oEvent){
            var profitCenterFld = oEvent.getSource();
            var profitCenterVal = profitCenterFld.getValue();
            this.getOwnerComponent().getModel().read("/profitCenterVH",{
                filters:[new Filter("ProfitCenter",FilterOperator.EQ,profitCenterVal)],
                success(oData){
                    if (oData.results.length < 1){
                        profitCenterFld.setValueState("Error");
                    }
                    else{
                        profitCenterFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });            

        },
        validWBS(oEvent){
            var wbsFld = oEvent.getSource();
            var wbsVal = wbsFld.getValue();
            this.getOwnerComponent().getModel().read("/I_WBSElementStdVH",{
                filters:[new Filter("WBSElement",FilterOperator.EQ,wbsVal)],
                success(oData){
                    if (oData.results.length < 1){
                        wbsFld.setValueState("Error");
                    }
                    else{
                        wbsFld.setValueState("None");
                    }
                },
                error(oError){

                }
            });            
            
        },
        validTaxCode(oEvent){
            var that = this;
            var taxCodeFld = oEvent.getSource();
            var taxCodeVal = taxCodeFld.getValue();
            var modelData = taxCodeFld.mBindingInfos.value.binding.oModel.getData();
            this.getOwnerComponent().getModel().read("/taxCodeVH",{
                filters:[new Filter("TaxCode",FilterOperator.EQ,taxCodeVal)],
                success(oData){
                    if (oData.results.length < 1){
                        taxCodeFld.setValueState("Error");
                        
                    }
                    else{
                        taxCodeFld.setValueState("None");
                        modelData.taxAmount = parseFloat(modelData.amount) * parseFloat(oData.results[0].TaxRate);
                        modelData.amountWithTax = modelData.taxAmount + parseFloat(modelData.amount);
                        taxCodeFld.mBindingInfos.value.binding.oModel.setData(modelData);
                        // if (this._calcAmountWithTax) { this._calcAmountWithTax(); }
                        if (that._showTaxFields)     { that._showTaxFields(); } 
                    }
                },
                error(oError){

                }
            });            

        }
    };
});


                    // "state":{"draftID":"None","compCode":"",
                    // "docDate":"","postDate":"","refer":"","headText":"","bankID":"","bankAcc":"",
                    // "bankGL":"","curr":"","payAmnt":"","debit":"","credit":"","balance":""