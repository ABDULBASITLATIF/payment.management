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

            this._pOAComCodeDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.OaFrag.ComCodeVhOa",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pOAComCodeDialog;
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
                this.byId("oa_companyCodeInput").setValue(sCompCode);
                MessageToast.show("Company Code selected: " + sCompCode);
            }
        },

        onCloseComCodeDialog: function () {
            if (this._pOAComCodeDialog) {
                this._pOAComCodeDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // SUPPLIER
        // ══════════════════════════════════════════════════════════════════
        onLoadSupplierVH: async function (oEvent) {
            const oView = this.getView();

            this._pOASupplierDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.OaFrag.SupplierVhOa",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pOASupplierDialog;
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
               
                this.byId("oa_supplierAccountInput").setValue(sSupplier);
                MessageToast.show("Supplier selected: " + sSupplier);
            }
        },

        onCloseSupplierDialog: function () {
            if (this._pOASupplierDialog) {
                this._pOASupplierDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK (filtered by Company Code)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode = this.byId("oa_companyCodeInput").getValue().trim();

            if (!sCompCode) {
                MessageToast.show("Please select Company Code first");
                return;
            }

            this._pOAHouseBankDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.OaFrag.HouseBankVhOa",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pOAHouseBankDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([new Filter("CompanyCode", FilterOperator.EQ, sCompCode)]);

            oDialog.open();
        },

        onSearchHouseBank: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sCompCode = this.byId("oa_companyCodeInput").getValue().trim();

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
                this.byId("oa_houseBankInput").setValue(sHouseBank);
                MessageToast.show("House Bank selected: " + sHouseBank);
            }
        },

        onCloseHouseBankDialog: function () {
            if (this._pOAHouseBankDialog) {
                this._pOAHouseBankDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK ACCOUNT (filtered by Company Code + House Bank)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankAccountVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode  = this.byId("oa_companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("oa_houseBankInput").getValue().trim();

            if (!sCompCode || !sHouseBank) {
                MessageToast.show("Please select Company Code and House Bank first");
                return;
            }

            this._pOAHouseBankAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.OaFrag.HouseBankAccountVhOa",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pOAHouseBankAccountDialog;

            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank",   FilterOperator.EQ, sHouseBank)
            ]);

            oDialog.open();
        },

        onSearchHouseBankAccount: function (oEvent) {
            const sValue     = oEvent.getParameter("value");
            const sCompCode  = this.byId("oa_companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("oa_houseBankInput").getValue().trim();

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
                this.byId("oa_houseBankAccountInput").setValue(sHouseBankAccount);
                MessageToast.show("House Bank Account selected: " + sHouseBankAccount);
            }
        },

        onCloseHouseBankAccountDialog: function () {
            if (this._pOAHouseBankAccountDialog) {
                this._pOAHouseBankAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // GL ACCOUNT (filtered by Company Code + House Bank + House Bank Account)
        // ══════════════════════════════════════════════════════════════════
        onLoadGLVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode         = this.byId("oa_companyCodeInput").getValue().trim();
            const sHouseBank        = this.byId("oa_houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("oa_houseBankAccountInput").getValue().trim();

            if (!sCompCode || !sHouseBank || !sHouseBankAccount) {
                MessageToast.show("Please select Company Code, House Bank, and House Bank Account first");
                return;
            }

            this._pOAGLAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.OaFrag.GLAccountVhOa",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pOAGLAccountDialog;

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
            const sCompCode         = this.byId("oa_companyCodeInput").getValue().trim();
            const sHouseBank        = this.byId("oa_houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("oa_houseBankAccountInput").getValue().trim();

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
                this.byId("oa_glAccountInput").setValue(sGLAccount);
                MessageToast.show("G/L Account selected: " + sGLAccount);
            }
        },

        onCloseGLAccountDialog: function () {
            if (this._pOAGLAccountDialog) {
                this._pOAGLAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        }
    };
});