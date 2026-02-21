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

            this._pComCodeDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.ComCodeVh",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pComCodeDialog;
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
                this.byId("companyCodeInput").setValue(sCompCode);
                MessageToast.show("Company Code selected: " + sCompCode);
            }
        },

        onCloseComCodeDialog: function () {
            if (this._pComCodeDialog) {
                this._pComCodeDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // SUPPLIER
        // ══════════════════════════════════════════════════════════════════
        onLoadSupplierVH: async function (oEvent) {
            const oView = this.getView();

            this._pSupplierDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.SupplierVh",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pSupplierDialog;
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
                this.byId("supplierAccountInput").setValue(sSupplier);
                
                // Trigger vendor submit to load open items
                this.onVendorSubmit({ getSource: () => ({ getValue: () => sSupplier }) });
                
                MessageToast.show("Supplier selected: " + sSupplier);
            }
        },

        onCloseSupplierDialog: function () {
            if (this._pSupplierDialog) {
                this._pSupplierDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK (filtered by Company Code)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode = this.byId("companyCodeInput").getValue().trim();

            if (!sCompCode) {
                MessageToast.show("Please select Company Code first");
                return;
            }

            this._pHouseBankDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.HouseBankVh",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pHouseBankDialog;

            // Filter by selected Company Code
            const oBinding = oDialog.getBinding("items");
            oBinding.filter([new Filter("CompanyCode", FilterOperator.EQ, sCompCode)]);

            oDialog.open();
        },

        onSearchHouseBank: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sCompCode = this.byId("companyCodeInput").getValue().trim();
            
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
                this.byId("houseBankInput").setValue(sHouseBank);
                MessageToast.show("House Bank selected: " + sHouseBank);
            }
        },

        onCloseHouseBankDialog: function () {
            if (this._pHouseBankDialog) {
                this._pHouseBankDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // HOUSE BANK ACCOUNT (filtered by Company Code + House Bank)
        // ══════════════════════════════════════════════════════════════════
        onLoadHouseBankAccountVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode = this.byId("companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("houseBankInput").getValue().trim();

            if (!sCompCode || !sHouseBank) {
                MessageToast.show("Please select Company Code and House Bank first");
                return;
            }

            this._pHouseBankAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.HouseBankAccountVh",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pHouseBankAccountDialog;

            // Filter by Company Code + House Bank
            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank", FilterOperator.EQ, sHouseBank)
            ]);

            oDialog.open();
        },

        onSearchHouseBankAccount: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sCompCode = this.byId("companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("houseBankInput").getValue().trim();
            
            const aFilters = [
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank", FilterOperator.EQ, sHouseBank)
            ];
            
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("HouseBankAccount", FilterOperator.Contains, sValue),
                        new Filter("BankAccount", FilterOperator.Contains, sValue),
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
        
        // Set only House Bank Account ID (not Bank Account Number)
        this.byId("houseBankAccountInput").setValue(sHouseBankAccount);
        
        MessageToast.show("House Bank Account selected: " + sHouseBankAccount);
    }
},

        onCloseHouseBankAccountDialog: function () {
            if (this._pHouseBankAccountDialog) {
                this._pHouseBankAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        // ══════════════════════════════════════════════════════════════════
        // GL ACCOUNT (filtered by Company Code + House Bank + House Bank Account)
        // ══════════════════════════════════════════════════════════════════
        onLoadGLVH: async function (oEvent) {
            const oView = this.getView();
            const sCompCode = this.byId("companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("houseBankAccountInput").getValue().trim();

            if (!sCompCode || !sHouseBank || !sHouseBankAccount) {
                MessageToast.show("Please select Company Code, House Bank, and House Bank Account first");
                return;
            }

            this._pGLAccountDialog ??= Fragment.load({
                id: oView.getId(),
                name: "zfi.payment.management.fragments.GLAccountVh",
                controller: this
            }).then(function (oDialog) {
                oView.addDependent(oDialog);
                return oDialog;
            });

            const oDialog = await this._pGLAccountDialog;

            // Filter by CompanyCode + HouseBank + HouseBankAccount
            const oBinding = oDialog.getBinding("items");
            oBinding.filter([
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank", FilterOperator.EQ, sHouseBank),
                new Filter("HouseBankAccount", FilterOperator.EQ, sHouseBankAccount)
            ]);

            oDialog.open();
        },

        onSearchGLAccount: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sCompCode = this.byId("companyCodeInput").getValue().trim();
            const sHouseBank = this.byId("houseBankInput").getValue().trim();
            const sHouseBankAccount = this.byId("houseBankAccountInput").getValue().trim();
            
            const aFilters = [
                new Filter("CompanyCode", FilterOperator.EQ, sCompCode),
                new Filter("HouseBank", FilterOperator.EQ, sHouseBank),
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
                this.byId("glAccountInput").setValue(sGLAccount);
                MessageToast.show("G/L Account selected: " + sGLAccount);
            }
        },

        onCloseGLAccountDialog: function () {
            if (this._pGLAccountDialog) {
                this._pGLAccountDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        }
    };
});