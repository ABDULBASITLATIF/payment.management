sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator"
], function (MessageToast, Filter, Fragment, FilterOperator) {
    "use strict";
    return {

        // ══════════════════════════════════════════════════════════════════
        // COMPANY CODE
        // ══════════════════════════════════════════════════════════════════
        onLoadCCVH: async function (oEvent) {
            const oView = this.getView();
            var aFilters = [];

            this._pGLComCodeDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.PGLFrag.ComCodeVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLComCodeDialog;
            aFilters.push(new Filter("Country", FilterOperator.Contains, 'OM'));
            oDialog.getBinding("items").filter(aFilters);
            oDialog.open();
        },

        onSearchComCode: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("CompanyCode", FilterOperator.Contains, sValue),
                        new Filter("CompanyCodeName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmComCode: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sCompCode = oSelectedItem.getTitle();
                this.getView().getModel("glData").setProperty("/values/compCode", sCompCode);
                MessageToast.show("Company Code selected: " + sCompCode);
            }
        },

        onCloseComCodeDialog: function () {
            if (this._pGLComCodeDialog) {
                this._pGLComCodeDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // SUPPLIER
        // ══════════════════════════════════════════════════════════════════
        onLoadSupplierVH: async function (oEvent) {
            const oView     = this.getView();
            const sCompCode = this.byId("pgl_companyCodeInput").getValue().trim();

            if (!sCompCode) {
                MessageToast.show("Please select Company Code first");
                return;
            }

            this._pGLSupplierDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.PGLFrag.SupplierVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLSupplierDialog;

            oDialog.getBinding("items").filter([
                new Filter("compCode", FilterOperator.EQ, sCompCode)
            ]);

            oDialog.open();
        },

        onSearchSupplier: function (oEvent) {
            const sValue    = oEvent.getParameter("value");
            const sCompCode = this.byId("pgl_companyCodeInput").getValue().trim();

            const aFilters = [
                new Filter("compCode", FilterOperator.EQ, sCompCode)
            ];

            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("Supplier",     FilterOperator.Contains, sValue),
                        new Filter("SupplierName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmSupplier: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oContext      = oSelectedItem.getBindingContext();
                const sSupplier     = oContext.getProperty("Supplier");
                const sSupplierName = oContext.getProperty("SupplierName");
                this.getView().getModel("pageModel").setProperty("/supplierName", sSupplierName || "");
                MessageToast.show("Supplier selected: " + sSupplier);
            }
        },
        
        onSupplierInputChange: function (oEvent) {
            const sValue    = oEvent.getSource().getValue().trim();
            const sCompCode = this.byId("pgl_companyCodeInput").getValue().trim();

            if (!sValue) {
                this.getView().getModel("pageModel")
                    .setProperty("/supplierName", "");
                return;
            }

            const oDataModel = this.getOwnerComponent().getModel();
            const that = this;
            oDataModel.read("/suppVH", {
                filters: [
                    new Filter("Supplier",  FilterOperator.EQ, sValue),
                    new Filter("compCode",  FilterOperator.EQ, sCompCode)
                ],
                success: function (oData) {
                    const aResults = oData.results || [];
                    if (aResults.length > 0) {
                        that.getView().getModel("pageModel")
                            .setProperty("/supplierName", aResults[0].SupplierName || "");
                    } else {
                        that.getView().getModel("pageModel")
                            .setProperty("/supplierName", "");
                    }
                },
                error: function () {
                    that.getView().getModel("pageModel")
                        .setProperty("/supplierName", "");
                }
            });
        },

        onCloseSupplierDialog: function () {
            if (this._pGLSupplierDialog) {
                this._pGLSupplierDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK (filtered by Company Code)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode = this.byId("pgl_companyCodeInput").getValue().trim();

            if (!sCompCode) {
                MessageToast.show("Please select Company Code first");
                return;
            }

            this._pGLHouseBankDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.PGLFrag.HouseBankVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLHouseBankDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([new Filter("CompanyCode", FilterOperator.EQ, sCompCode)]);

            oDialog.open();
        },

        onSearchHouseBank: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sCompCode = this.byId("pgl_companyCodeInput").getValue().trim();

            const aFilters = [new Filter("CompanyCode", FilterOperator.EQ, sCompCode)];

            if (sValue) {
                aFilters.push(new Filter("HouseBank", FilterOperator.Contains, sValue));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmHouseBank: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sHouseBank = oSelectedItem.getTitle();
                this.getView().getModel("glData").setProperty("/values/bankID", sHouseBank);
                MessageToast.show("House Bank selected: " + sHouseBank);
            }
        },

        onCloseHouseBankDialog: function () {
            if (this._pGLHouseBankDialog) {
                this._pGLHouseBankDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK ACCOUNT (filtered by Company Code + House Bank)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankAccountVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode  = this.byId("pgl_companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("pgl_houseBankInput").getValue().trim();

            if (!sCompCode || !sHouseBank) {
                MessageToast.show("Please select Company Code and House Bank first");
                return;
            }

            this._pGLHouseBankAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.PGLFrag.HouseBankAccountVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLHouseBankAccountDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",   FilterOperator.EQ, sHouseBank)
            ]);

            oDialog.open();
        },

        onSearchHouseBankAccount: function (oEvent) {
            const sValue     = oEvent.getParameter("value");
            const sCompCode  = this.byId("pgl_companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("pgl_houseBankInput").getValue().trim();

            const aFilters = [
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",   FilterOperator.EQ, sHouseBank)
            ];

            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("HouseBankAccount",            FilterOperator.Contains, sValue),
                        new Filter("BankAccount",                 FilterOperator.Contains, sValue),
                        new Filter("HouseBankAccountDescription", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },
        onConfirmHouseBankAccount: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oContext          = oSelectedItem.getBindingContext();
                const sHouseBankAccount = oContext.getProperty("HouseBankAccount");
                this.getView().getModel("glData").setProperty("/values/bankAcc", sHouseBankAccount);
                MessageToast.show("House Bank Account selected: " + sHouseBankAccount);
            }
        },


        onCloseHouseBankAccountDialog: function () {
            if (this._pGLHouseBankAccountDialog) {
                this._pGLHouseBankAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // GL ACCOUNT (filtered by Company Code + House Bank + House Bank Account)
        // ══════════════════════════════════════════════════════════════════
        onLoadGLVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode         = this.byId("pgl_companyCodeInput").getValue().trim();
            const sHouseBank        = this.byId("pgl_houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("pgl_houseBankAccountInput").getValue().trim();

            if (!sCompCode || !sHouseBank || !sHouseBankAccount) {
                MessageToast.show("Please select Company Code, House Bank, and House Bank Account first");
                return;
            }

            this._pGLGLAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.PGLFrag.GLAccountVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLGLAccountDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode",      FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",        FilterOperator.EQ, sHouseBank),
                new Filter("HouseBankAccount", FilterOperator.EQ, sHouseBankAccount)
            ]);

            oDialog.open();
        },
        //latest push 

        onSearchGLAccount: function (oEvent) {
            const sValue            = oEvent.getParameter("value");
            const sCompCode         = this.byId("pgl_companyCodeInput").getValue().trim();
            const sHouseBank        = this.byId("pgl_houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("pgl_houseBankAccountInput").getValue().trim();

            const aFilters = [
                new Filter("CompanyCode",      FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",        FilterOperator.EQ, sHouseBank),
                new Filter("HouseBankAccount", FilterOperator.EQ, sHouseBankAccount)
            ];

            if (sValue) {
                aFilters.push(new Filter("GLAccount", FilterOperator.Contains, sValue));
            }

            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmGLAccount: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sGLAccount = oSelectedItem.getTitle();
                this.getView().getModel("glData").setProperty("/values/bankGL", sGLAccount);
                MessageToast.show("G/L Account selected: " + sGLAccount);
            }
        },
        onCloseGLAccountDialog: function () {
            if (this._pGLGLAccountDialog) {
                this._pGLGLAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },
        // ══════════════════════════════════════════════════════════════════
        // COST CENTER
        // ══════════════════════════════════════════════════════════════════
        onLoadCostCenterVH: async function () {
            const oView = this.getView();

            this._pGLCostCenterDialog ??= Fragment.load({
                id:         oView.getId(),
                name:       "zfi.payment.management.fragments.PGLFrag.CostCenVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLCostCenterDialog;
            oDialog.getBinding("items").filter([]);
            oDialog.open();
        },

        onSearchCostCenter: function (oEvent) {
            const sValue   = oEvent.getParameter("value");
            const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("CostCenter",     FilterOperator.Contains, sValue),
                        new Filter("CostCenterName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmCostCenter: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sCostCenter = oSelectedItem.getTitle();
                this.getView().getModel("itemData").setProperty("/costCenter", sCostCenter);
                MessageToast.show("Cost Center selected: " + sCostCenter);
            }
        },

        onCloseCostCenterDialog: function () {
            if (this._pGLCostCenterDialog) {
                this._pGLCostCenterDialog.then(function (oDialog) { oDialog.close(); });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // PROFIT CENTER
        // ══════════════════════════════════════════════════════════════════
        onLoadProfitCenterVH: async function () {
            const oView = this.getView();

            this._pGLProfitCenterDialog ??= Fragment.load({
                id:         oView.getId(),
                name:       "zfi.payment.management.fragments.PGLFrag.ProfitCenVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLProfitCenterDialog;
            oDialog.getBinding("items").filter([]);
            oDialog.open();
        },

        onSearchProfitCenter: function (oEvent) {
            const sValue   = oEvent.getParameter("value");
            const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("ProfitCenter",     FilterOperator.Contains, sValue),
                        new Filter("ProfitCenterName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmProfitCenter: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sProfitCenter = oSelectedItem.getTitle();
                this.getView().getModel("itemData").setProperty("/profitCenter", sProfitCenter);
                MessageToast.show("Profit Center selected: " + sProfitCenter);
            }
        },

        onCloseProfitCenterDialog: function () {
            if (this._pGLProfitCenterDialog) {
                this._pGLProfitCenterDialog.then(function (oDialog) { oDialog.close(); });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // WBS ELEMENT
        // ══════════════════════════════════════════════════════════════════
        onLoadWBSVH: async function () {
            const oView = this.getView();

            this._pGLWBSDialog ??= Fragment.load({
                id:         oView.getId(),
                name:       "zfi.payment.management.fragments.PGLFrag.WbsVhPGL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLWBSDialog;
            oDialog.getBinding("items").filter([]);
            oDialog.open();
        },

        onSearchWBS: function (oEvent) {
            const sValue   = oEvent.getParameter("value");
            const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("WBSElement",    FilterOperator.Contains, sValue),
                        new Filter("WBSDescription",FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmWBS: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sWBS = oSelectedItem.getTitle();
                this.getView().getModel("itemData").setProperty("/wbs", sWBS);
                MessageToast.show("WBS Element selected: " + sWBS);
            }
        },

        onCloseWBSDialog: function () {
            if (this._pGLWBSDialog) {
                this._pGLWBSDialog.then(function (oDialog) { oDialog.close(); });
            }
        },
        // ══════════════════════════════════════════════════════════════════
        // TAX CODE
        // ══════════════════════════════════════════════════════════════════
        onLoadTaxCodeVH: async function () {
            const oView      = this.getView();
            const oMainModel = this.getOwnerComponent().getModel();
            const that       = this;

            this._pGLTaxCodeDialog ??= Fragment.load({
                id:         oView.getId(),
                name:       "zfi.payment.management.fragments.PGLFrag.TaxCodeVHGPL",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            // Load data first, then open dialog once model is ready
            oMainModel.read("/taxCodeVH", {
                success: async function (oData) {
                    const aAll    = oData.results || [];
                    const oSeen   = {};
                    const aUnique = [];

                    aAll.forEach(function (oItem) {
                        if (!oSeen[oItem.TaxCode]) {
                            oSeen[oItem.TaxCode] = true;
                            aUnique.push({
                                TaxCode:            oItem.TaxCode,
                                TaxCodeDescription: oItem.TaxCodeDescription || "",
                                TaxRate:            oItem.TaxRate             || "0.000",
                                RateUnit:           oItem.RateUnit            || ""
                            });
                        }
                    });

                    aUnique.sort(function (a, b) {
                        return a.TaxCode.localeCompare(b.TaxCode);
                    });

                    const oTaxModel = new sap.ui.model.json.JSONModel({ items: aUnique });
                    oView.setModel(oTaxModel, "taxCodes");

                    // Open dialog only after model is set
                    const oDialog = await that._pGLTaxCodeDialog;
                    oDialog.open();
                },
                error: function () {
                    sap.m.MessageBox.error("Failed to load tax codes.");
                }
            });
        },

        onSearchTaxCode: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("TaxCode",            FilterOperator.Contains, sValue),
                        new Filter("TaxCodeDescription", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        // onConfirmTaxCode: function (oEvent) {
        //     const oSelectedItem = oEvent.getParameter("selectedItem");
        //     if (oSelectedItem) {
        //         const oContext = oSelectedItem.getBindingContext("taxCodes");
        //         const sTaxCode = oContext.getProperty("TaxCode");
        //         const sDesc    = oContext.getProperty("TaxCodeDescription");
        //         this.getView().getModel("itemData").setProperty("/taxCode", sTaxCode);
        //         MessageToast.show("Tax Code selected: " + sTaxCode + (sDesc ? " - " + sDesc : ""));
        //         if (this._calcAmountWithTax) { this._calcAmountWithTax(); }
        //     }
        // },

        onConfirmTaxCode: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oCtx   = oSelectedItem.getBindingContext("taxCodes");
                const sTaxCode = oCtx.getProperty("TaxCode");
                const sDesc    = oCtx.getProperty("TaxCodeDescription");
                this.getView().getModel("itemData").setProperty("/taxCode", sTaxCode);
                MessageToast.show("Tax Code selected: " + sTaxCode + (sDesc ? " - " + sDesc : ""));
                if (this._calcAmountWithTax) { this._calcAmountWithTax(); }
            }
        },

        onCloseTaxCodeDialog: function () {
            if (this._pGLTaxCodeDialog) {
                this._pGLTaxCodeDialog.then(function (oDialog) { oDialog.close(); });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // LINE ITEM GL ACCOUNT
        // ══════════════════════════════════════════════════════════════════
        onLoadLineGLVH: async function () {
            const oView     = this.getView();
       

            this._pGLLineGLDialog ??= Fragment.load({
                id:         oView.getId(),
                name:       "zfi.payment.management.fragments.PGLFrag.LineGLVH",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLLineGLDialog;

  
            oDialog.open();
        },

        onSearchLineGLAccount: function (oEvent) {
            const sValue    = oEvent.getParameter("value");
        const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("GLAccount", FilterOperator.Contains, sValue),
                        new Filter("longText",  FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);

       
        },
        onConfirmLineGLAccount: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const oContext   = oSelectedItem.getBindingContext();
                const sGLAccount = oContext.getProperty("GLAccount");
                const sLongText  = oContext.getProperty("longText");
                this.getView().getModel("itemData").setProperty("/glAccount", sGLAccount);
                MessageToast.show("G/L Account selected: " + sGLAccount + (sLongText ? " - " + sLongText : ""));
            }
        },

        onCloseLineGLAccountDialog: function () {
            if (this._pGLLineGLDialog) {
                this._pGLLineGLDialog.then(function (oDialog) { oDialog.close(); });
            }
        },
    };
});