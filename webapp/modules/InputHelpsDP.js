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

            this._pDPComCodeDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.DpFrag.ComCodeVhDp",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pDPComCodeDialog;
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
                this.byId("dp_companyCodeInput").setValue(sCompCode);
                MessageToast.show("Company Code selected: " + sCompCode);
            }
        },

        onCloseComCodeDialog: function () {
            if (this._pDPComCodeDialog) {
                this._pDPComCodeDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // SUPPLIER
        // ══════════════════════════════════════════════════════════════════
        onLoadSupplierVH: async function (oEvent) {
            const oView = this.getView();

            this._pDPSupplierDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.DpFrag.SupplierVhDp",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pDPSupplierDialog;
            oDialog.open();
        },

        onSearchSupplier: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const aFilters = sValue
                ? [new Filter({
                    filters: [
                        new Filter("Supplier", FilterOperator.Contains, sValue),
                        new Filter("BPSupplierName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })]
                : [];
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onConfirmSupplier: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sSupplier = oSelectedItem.getTitle();
                this.byId("dp_supplierAccountInput").setValue(sSupplier);

                const sCurr = this.byId("dp_currencyInput") 
                    ? this.byId("dp_currencyInput").getValue().trim() : "";

                if (!sCurr) {
                    MessageToast.show("Supplier selected. Please enter Currency to load open items.");
                    return;
                }

                // Trigger load with both vendor and currency
                this._loadOpenItems(sSupplier, sCurr);
                MessageToast.show("Supplier selected: " + sSupplier);
            }
        },

        onCloseSupplierDialog: function () {
            if (this._pDPSupplierDialog) {
                this._pDPSupplierDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK (filtered by Company Code)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode = this.byId("dp_companyCodeInput").getValue().trim();

            if (!sCompCode) {
                MessageToast.show("Please select Company Code first");
                return;
            }

            this._pDPHouseBankDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.DpFrag.HouseBankVhDp",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pDPHouseBankDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([new Filter("CompanyCode", FilterOperator.EQ, sCompCode)]);

            oDialog.open();
        },

        onSearchHouseBank: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sCompCode = this.byId("dp_companyCodeInput").getValue().trim();

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
                this.byId("dp_houseBankInput").setValue(sHouseBank);
                MessageToast.show("House Bank selected: " + sHouseBank);
            }
        },

        onCloseHouseBankDialog: function () {
            if (this._pDPHouseBankDialog) {
                this._pDPHouseBankDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK ACCOUNT (filtered by Company Code + House Bank)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankAccountVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode  = this.byId("dp_companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("dp_houseBankInput").getValue().trim();

            if (!sCompCode || !sHouseBank) {
                MessageToast.show("Please select Company Code and House Bank first");
                return;
            }

            this._pDPHouseBankAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.DpFrag.HouseBankAccountVhDp",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pDPHouseBankAccountDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",   FilterOperator.EQ, sHouseBank)
            ]);

            oDialog.open();
        },

        onSearchHouseBankAccount: function (oEvent) {
            const sValue     = oEvent.getParameter("value");
            const sCompCode  = this.byId("dp_companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("dp_houseBankInput").getValue().trim();

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
                const oContext = oSelectedItem.getBindingContext();
                const sHouseBankAccount = oContext.getProperty("HouseBankAccount");
                this.byId("dp_houseBankAccountInput").setValue(sHouseBankAccount);
                MessageToast.show("House Bank Account selected: " + sHouseBankAccount);
            }
        },

        onCloseHouseBankAccountDialog: function () {
            if (this._pDPHouseBankAccountDialog) {
                this._pDPHouseBankAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // GL ACCOUNT (filtered by Company Code + House Bank + House Bank Account)
        // ══════════════════════════════════════════════════════════════════
        onLoadGLVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode         = this.byId("dp_companyCodeInput").getValue().trim();
            const sHouseBank        = this.byId("dp_houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("dp_houseBankAccountInput").getValue().trim();

            if (!sCompCode || !sHouseBank || !sHouseBankAccount) {
                MessageToast.show("Please select Company Code, House Bank, and House Bank Account first");
                return;
            }

            this._pDPGLAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.DpFrag.GLAccountVhDp",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pDPGLAccountDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode",      FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",        FilterOperator.EQ, sHouseBank),
                new Filter("HouseBankAccount", FilterOperator.EQ, sHouseBankAccount)
            ]);

            oDialog.open();
        },

        onSearchGLAccount: function (oEvent) {
            const sValue            = oEvent.getParameter("value");
            const sCompCode         = this.byId("dp_companyCodeInput").getValue().trim();
            const sHouseBank        = this.byId("dp_houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("dp_houseBankAccountInput").getValue().trim();

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
                this.byId("dp_glAccountInput").setValue(sGLAccount);
                MessageToast.show("G/L Account selected: " + sGLAccount);
            }
        },

        onCloseGLAccountDialog: function () {
            if (this._pDPGLAccountDialog) {
                this._pDPGLAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // SPECIAL GL INDICATOR
        // ══════════════════════════════════════════════════════════════════
onLoadSPGL: async function (oEvent) {
    const oView = this.getView();
    const oDataModel = oView.getModel();

    if (this._pDPSPGLDialog) {
        const oOld = await this._pDPSPGLDialog;
        oOld.destroy();
        this._pDPSPGLDialog = null;
    }

    this._pDPSPGLDialog = Fragment.load({
        id: oView.getId(),
        name: "zfi.payment.management.fragments.DpFrag.SpGLVhDp",
        controller: this
    }).then(function (oDialog) {
        oView.addDependent(oDialog);
        return oDialog;
    });

    const oDialog = await this._pDPSPGLDialog;
    oDialog.setBusy(true);
    oDialog.open();

    oDataModel.read("/spGLVH", {
        success: function (oData) {
            const oJsonModel = new sap.ui.model.json.JSONModel({ results: oData.results || [] });
            oDialog.setModel(oJsonModel, "spGL");
            oDialog.bindAggregation("items", {
                path: "spGL>/results",
                template: new sap.m.StandardListItem({
                    title: "{spGL>spGL}",
                    description: "{spGL>shortText}",
                    tooltip: "{spGL>longText}",
                    type: "Active"
                })
            });
            oDialog.setBusy(false);
        },
        error: function () {
            oDialog.setBusy(false);
            sap.m.MessageToast.show("Failed to load Special GL indicators");
        }
    });
},

onSearchSPGL: function (oEvent) {
    const sValue = oEvent.getParameter("value").toLowerCase();
    const oDialog = oEvent.getSource();
    const oModel  = oDialog.getModel("spGL");
    if (!oModel) { return; }

    const aAll = oModel.getProperty("/results") || [];
    const aFiltered = sValue
        ? aAll.filter(function (o) {
            return (o.spGL      && o.spGL.toLowerCase().indexOf(sValue)      > -1)
                || (o.shortText && o.shortText.toLowerCase().indexOf(sValue) > -1)
                || (o.longText  && o.longText.toLowerCase().indexOf(sValue)  > -1);
          })
        : aAll;

    oDialog.bindAggregation("items", {
        path: "spGL>/filtered",
        template: new sap.m.StandardListItem({
            title: "{spGL>spGL}",
            description: "{spGL>shortText}",
            tooltip: "{spGL>longText}",
            type: "Active"
        })
    });
    oModel.setProperty("/filtered", aFiltered);
},

onConfirmSPGL: function (oEvent) {
    const oSelectedItem = oEvent.getParameter("selectedItem");
    if (oSelectedItem) {
        const oCtx  = oSelectedItem.getBindingContext("spGL");
        const sSpGL = oCtx ? oCtx.getProperty("spGL") : oSelectedItem.getTitle();
        this.byId("dp_glvh").setValue(sSpGL,);
        MessageToast.show("Special GL selected: " + sSpGL);
    }
},
        onCloseSPGLDialog: function () {
            if (this._pDPSPGLDialog) {
                this._pDPSPGLDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },
    };
});