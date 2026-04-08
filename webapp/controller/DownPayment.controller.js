sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../modules/InputHelpsDP"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, InputHelpsDP) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.DownPayment", {
        InputHelpsDP: InputHelpsDP,

        onInit: function () {
            const oModel = new JSONModel({
                openItems: [],
                itemsToBeCleared: []
            });
            this.getView().setModel(oModel, "openItems");

            const oPageModel = new JSONModel({
                mode: "create",
                draftId: null
            });
            this.getView().setModel(oPageModel, "pageModel");

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDownPayment").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sDraftId = oArgs.draftId;

            if (sDraftId && sDraftId !== "new") {
                this.getView().getModel("pageModel").setData({ mode: "edit", draftId: sDraftId });
                this._loadDraft(sDraftId);
            } else {
                this.getView().getModel("pageModel").setData({ mode: "create", draftId: null });
                this._resetPage();
            }
        },

        _resetPage: function () {
            const oModel = this.getView().getModel("openItems");
            oModel.setData({ openItems: [], itemsToBeCleared: [] });

            const aInputIds = [
                "dp_draftidInput", "dp_companyCodeInput", "dp_fiscalYearInput",
                "dp_referenceInput", "dp_headerTextInput", "dp_houseBankInput",
                "dp_houseBankAccountInput", "dp_glAccountInput", "dp_supplierAccountInput",
                "dp_currencyInput", "dp_payAmountInput", "dp_invoiceSumInput", "dp_balanceInput"
            ];
            aInputIds.forEach(function (sId) {
                const oCtrl = this.byId(sId);
                if (oCtrl) {
                    oCtrl.setValue("");
                    if (oCtrl.setValueState) { oCtrl.setValueState(sap.ui.core.ValueState.None); }
                }
            }.bind(this));

            const oDocPicker  = this.byId("dp_documentDatePicker");
            const oPostPicker = this.byId("dp_postingDatePicker");
            if (oDocPicker)  { oDocPicker.setValue("");  }
            if (oPostPicker) { oPostPicker.setValue(""); }

            this._bDisplayMode = false;
            this._applyDisplayMode("");
            this._updateTableTitles();
        },

        _loadDraft: function (sDraftId) {
            const oDataModel = this.getOwnerComponent().getModel();
            const that = this;

            this.getView().setBusy(true);

            oDataModel.read("/head('" + sDraftId + "')", {
                urlParameters: { "$expand": "to_item" },
                success: function (oHead) {
                    that.getView().setBusy(false);
                    that._populateFormFields(oHead);

                    const sVendor      = oHead.vendor;
                    const aToItems     = oHead.to_item && oHead.to_item.results ? oHead.to_item.results : [];
                    const aItemsToBeCleared = aToItems.map(function (oItem) {
                        return that._mapItemToUIFormat(oItem);
                    });

                    that._loadOpenItemsExcluding(sVendor, aItemsToBeCleared, aToItems);

                    if (oHead.draftSt === "2" || oHead.draftSt === "3" || oHead.draftSt === "4" ||
                        oHead.draftSt === "5" || oHead.draftSt === "6") {
                        const apFilters = [new Filter("draftID", FilterOperator.EQ, sDraftId)];
                        oDataModel.read("/aprvrs", {
                            filters: apFilters,
                            success: function (oData) {
                                const oAprvrModel = new JSONModel(oData.results);
                                that.getView().setModel(oAprvrModel, "aprvrTab");
                                const oAprvrTable = that.byId("dp_aprvrTable");
                                if (oAprvrTable) { oAprvrTable.setVisible(true); }
                            },
                            error: function (oErr) {
                                console.log("Approvers error:", JSON.stringify(oErr));
                            }
                        });
                    }
                },
                error: function () {
                    that.getView().setBusy(false);
                    MessageBox.error("Failed to load draft.");
                }
            });
        },

        _populateFormFields: function (oHead) {
            const fnSet = function (sId, sValue) {
                const oCtrl = this.byId(sId);
                if (oCtrl) { oCtrl.setValue(sValue || ""); }
            }.bind(this);

            const fnSetDate = function (sId, value) {
                const oCtrl = this.byId(sId);
                if (!oCtrl || !value) { return; }
                let oDate = null;
                if (value instanceof Date) {
                    oDate = value;
                } else if (typeof value === "string" && value.indexOf("/Date(") === 0) {
                    const sTs = value.replace("/Date(", "").replace(")/", "").split("+")[0];
                    oDate = new Date(parseInt(sTs));
                } else if (typeof value === "string" && value.indexOf("T") > -1) {
                    oDate = new Date(value);
                } else if (typeof value === "string" && value.indexOf("-") > -1) {
                    const aParts = value.split("-");
                    oDate = new Date(parseInt(aParts[0]), parseInt(aParts[1]) - 1, parseInt(aParts[2]));
                }
                if (oDate && !isNaN(oDate.getTime())) { oCtrl.setDateValue(oDate); }
            }.bind(this);

            fnSet("dp_draftidInput",          oHead.draftId);
            fnSet("dp_companyCodeInput",       oHead.compCode);
            fnSet("dp_fiscalYearInput",        oHead.fiscYear);
            fnSet("dp_referenceInput",         oHead.reference);
            fnSet("dp_headerTextInput",        oHead.headText);
            fnSet("dp_houseBankInput",         oHead.bankKey);
            fnSet("dp_houseBankAccountInput",  oHead.bankAcc);
            fnSet("dp_supplierAccountInput",   oHead.vendor);
            fnSet("dp_glAccountInput",         oHead.bankGL);
            fnSet("dp_payAmountInput",         oHead.payAmnt);
            fnSet("dp_currencyInput",          oHead.curr);
            fnSetDate("dp_documentDatePicker", oHead.docDate);
            fnSetDate("dp_postingDatePicker",  oHead.postingDate);

            const oPageModel = this.getView().getModel("pageModel");
            oPageModel.setProperty("/postDoc",  oHead.postDoc  || "");
            oPageModel.setProperty("/msg",      oHead.msg      || "");
            oPageModel.setProperty("/draftSt",  oHead.draftSt  || "");
            this._applyDisplayMode(oHead.draftSt);
        },

        _applyDisplayMode: function (sDraftSt) {
            const bIsInApproval = sDraftSt === "2";
            const bIsCreated    = sDraftSt === "1";
            const bIsApproved   = sDraftSt === "3";
            const bIsRejected   = sDraftSt === "4";
            const bIsPosted     = sDraftSt === "5";
            const bIsPostErr    = sDraftSt === "6";

            const oEditFormBox    = this.byId("dp_editFormBox");
            const oDisplayFormBox = this.byId("dp_displayFormBox");
            if (oEditFormBox)    { oEditFormBox.setVisible(!bIsInApproval && !bIsApproved && !bIsPosted && !bIsPostErr); }
            if (oDisplayFormBox) { oDisplayFormBox.setVisible(bIsInApproval || bIsApproved || bIsPosted || bIsPostErr); }

            if (bIsInApproval || bIsApproved || bIsPosted || bIsPostErr) {
                const oPageModel = this.getView().getModel("pageModel");
                const fnGet = function (sId) {
                    const oCtrl = this.byId(sId);
                    return oCtrl ? oCtrl.getValue() : "";
                }.bind(this);
                const fnGetDate = function (sId) {
                    const oCtrl = this.byId(sId);
                    if (!oCtrl) { return ""; }
                    const oDate = oCtrl.getDateValue();
                    if (!oDate) { return ""; }
                    return String(oDate.getDate()).padStart(2, "0") + "/" +
                           String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
                           oDate.getFullYear();
                }.bind(this);

                oPageModel.setProperty("/compCode",    fnGet("dp_companyCodeInput"));
                oPageModel.setProperty("/fiscYear",    fnGet("dp_fiscalYearInput"));
                oPageModel.setProperty("/reference",   fnGet("dp_referenceInput"));
                oPageModel.setProperty("/headText",    fnGet("dp_headerTextInput"));
                oPageModel.setProperty("/bankKey",     fnGet("dp_houseBankInput"));
                oPageModel.setProperty("/bankAcc",     fnGet("dp_houseBankAccountInput"));
                oPageModel.setProperty("/bankGL",      fnGet("dp_glAccountInput"));
                oPageModel.setProperty("/vendor",      fnGet("dp_supplierAccountInput"));
                oPageModel.setProperty("/curr",        fnGet("dp_currencyInput"));
                oPageModel.setProperty("/payAmnt",     fnGet("dp_payAmountInput"));
                oPageModel.setProperty("/invoiceSum",  fnGet("dp_invoiceSumInput"));
                oPageModel.setProperty("/balance",     fnGet("dp_balanceInput"));
                oPageModel.setProperty("/spGL", fnGet("dp_glvh"));    
                oPageModel.setProperty("/docDate",     fnGetDate("dp_documentDatePicker"));
                oPageModel.setProperty("/postingDate", fnGetDate("dp_postingDatePicker"));
            }

            const aAlwaysLockedIds = [
                "dp_supplierAccountInput", "dp_companyCodeInput", "dp_houseBankInput",
                "dp_houseBankAccountInput", "dp_glAccountInput"
            ];
            const aEditableIds = [
                "dp_fiscalYearInput", "dp_referenceInput", "dp_headerTextInput",
                "dp_currencyInput", "dp_payAmountInput",
                "dp_documentDatePicker", "dp_postingDatePicker"
            ];

            if (bIsInApproval || bIsApproved) {
                // display fragment handles
            } else if (bIsCreated || bIsRejected) {
                aAlwaysLockedIds.forEach(function (sId) {
                    const oCtrl = this.byId(sId);
                    if (oCtrl) { oCtrl.setEditable(false); }
                }.bind(this));
                aEditableIds.forEach(function (sId) {
                    const oCtrl = this.byId(sId);
                    if (oCtrl) { oCtrl.setEditable(true); }
                }.bind(this));
            } else {
                aAlwaysLockedIds.concat(aEditableIds).forEach(function (sId) {
                    const oCtrl = this.byId(sId);
                    if (oCtrl) { oCtrl.setEditable(true); }
                }.bind(this));
            }

            const oSaveButton      = this.byId("dp_saveButton");
            const oUpdateButton    = this.byId("dp_updateButton");
            const oSubmitButton    = this.byId("dp_submitButton");
            const oPostButton      = this.byId("dp_postButton");
            const oResubmitButton  = this.byId("dp_resubmitButton");
            const oOpenItemForm    = this.byId("dp_openItemsForm");
            const oAprvrTable      = this.byId("dp_aprvrTable");

            if (bIsInApproval) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oOpenItemForm)   { oOpenItemForm.setVisible(false);  }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
            } else if (bIsApproved) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(true);     }
                if (oOpenItemForm)   { oOpenItemForm.setVisible(false);  }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
            } else if (bIsCreated) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(true);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(true);   }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oOpenItemForm)   { oOpenItemForm.setVisible(true);   }
                if (oAprvrTable)     { oAprvrTable.setVisible(false);    }
            } else if (bIsRejected) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oResubmitButton) { oResubmitButton.setVisible(true); }
                if (oOpenItemForm)   { oOpenItemForm.setVisible(true);   }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
            } else if (bIsPosted) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oOpenItemForm)   { oOpenItemForm.setVisible(false);  }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
            } else if (bIsPostErr) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(true);     }
                if (oOpenItemForm)   { oOpenItemForm.setVisible(false);  }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
            } else {
                // Create mode
                if (oSaveButton)     { oSaveButton.setVisible(true);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(true);   }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oResubmitButton) { oResubmitButton.setVisible(false);}
                if (oOpenItemForm)   { oOpenItemForm.setVisible(true);   }
                if (oAprvrTable)     { oAprvrTable.setVisible(false);    }
            }

            this._bDisplayMode = bIsInApproval || bIsApproved || bIsPosted || bIsPostErr;

            const oClearColumn  = this.byId("dp_clearColumn");
            const oRemoveColumn = this.byId("dp_itc_col_remove");
            if (oClearColumn)  { oClearColumn.setVisible(!this._bDisplayMode);  }
            if (oRemoveColumn) { oRemoveColumn.setVisible(!this._bDisplayMode); }

            const oItemsToClearTable = this.byId("dp_itemsToClearTable");
            if (oItemsToClearTable) {
                oItemsToClearTable.getItems().forEach(function (oItem) {
                    const aCells = oItem.getCells();
                    if (aCells && aCells[0]) { aCells[0].setVisible(!this._bDisplayMode); }
                }.bind(this));
            }
        },
        
        formatAmount: function (value) {
            if (value !== null && value !== undefined && value !== "") {
                return parseFloat(value).toFixed(3);
            }
            return "";
        },

        _mapItemToUIFormat: function (oItem) {
            const fnAmt = function (v) {
                if (v === null || v === undefined || v === "") { return "0.000"; }
                const f = parseFloat(v);
                return isNaN(f) ? "0.000" : f.toFixed(3);
            };

            return {
                docNo:       oItem.refDoc,
                year1:       oItem.refYear,
                lineItem:    oItem.refLine,
                compCode:    oItem.compCode    || "",
                amntLC:      fnAmt(oItem.amntLC),   // ← safe parse
                amntDC:      fnAmt(oItem.amntDC),   // ← safe parse
                docType:     oItem.docType     || "",
                baseDate:    oItem.baseDate    || null,
                postingDate: oItem.postingDate || null,
                refNo:       oItem.extRef      || "",
                assignNo:    oItem.assignNo    || "",
                vendor:      oItem.vendorCode  || "",
                docCurr:        oItem.docCurr     || "",
                compCurr:        oItem.compCurr     || ""
            };
        },

        _loadOpenItemsExcluding: function (sVendor, aItemsToBeCleared, aOriginalToItems) {
            const oDataModel = this.getOwnerComponent().getModel();
            const oJSONModel = this.getView().getModel("openItems");
            const that = this;

            const oTable = this.byId("dp_openItemsTable");
            if (oTable) { oTable.setBusy(true); }

            const sCurr = this.byId("dp_currencyInput").getValue();
            const aFilters = [new Filter("vendor", FilterOperator.EQ, sVendor)];   // ← vendor
            if (sCurr) { aFilters.push(new Filter("docCurr", FilterOperator.EQ, sCurr)); }  // ← curr

            oDataModel.read("/dprItems", {                                           // ← changed entity set
                filters: aFilters,
                success: function (oData) {
                    if (oTable) { oTable.setBusy(false); }
                    const aAllOpenItems = oData.results || [];
                    const oClearedSet = new Set(
                        aOriginalToItems.map(function (oItem) {
                            return oItem.refDoc + "|" + oItem.refYear + "|" + oItem.refLine;
                        })
                    );
                    // key fields from dprItems: docNo, year1, lineItem
                    const aFiltered = aAllOpenItems.filter(function (oItem) {
                        return !oClearedSet.has(oItem.docNo + "|" + oItem.year1 + "|" + oItem.lineItem);
                    });
                    oJSONModel.setData({ openItems: aFiltered, itemsToBeCleared: aItemsToBeCleared });
                    that._updateTableTitles();
                    MessageToast.show("Loaded " + aFiltered.length + " open items, " + aItemsToBeCleared.length + " items to be cleared");
                },
                error: function () {
                    if (oTable) { oTable.setBusy(false); }
                    MessageBox.error("Failed to load open items for vendor: " + sVendor);
                }
            });
        },

        onVendorSubmit: function (oEvt) {
            const sVendor = oEvt.getSource().getValue().trim();
            const sCurr   = this.byId("dp_currencyInput") ? this.byId("dp_currencyInput").getValue().trim() : "";

            if (!sVendor) {
                this.getView().getModel("openItems").setData({ openItems: [], itemsToBeCleared: [] });
                this._updateTableTitles();
                return;
            }

            if (!sCurr) {
                MessageToast.show("Please enter Currency before loading open items");
                return;
            }

            this._loadOpenItems(sVendor, sCurr);
        },

        onCurrencyChange: function () {
            const sVendor = this.byId("dp_supplierAccountInput") 
                ? this.byId("dp_supplierAccountInput").getValue().trim() : "";
            const sCurr   = this.byId("dp_currencyInput") 
                ? this.byId("dp_currencyInput").getValue().trim() : "";

            if (!sVendor || !sCurr) { return; }

            this._loadOpenItems(sVendor, sCurr);
        },

        _loadOpenItems: function (sVendor, sCurr) {
            const oDataModel = this.getOwnerComponent().getModel();
            const that = this;
            const oTable = this.byId("dp_openItemsTable");
            if (oTable) { oTable.setBusy(true); }

            const aFilters = [
                new Filter("vendor", FilterOperator.EQ, sVendor),
                new Filter("docCurr",   FilterOperator.EQ, sCurr)
            ];

            oDataModel.read("/dprItems", {
                filters: aFilters,
                success: function (oData) {
                    const oJSONModel = that.getView().getModel("openItems");
                    const aResults = oData && oData.results ? oData.results : [];
                    oJSONModel.setData({ openItems: aResults, itemsToBeCleared: [] });
                    that._updateTableTitles();
                    MessageToast.show("Loaded " + aResults.length + " items");
                    if (oTable) { oTable.setBusy(false); }
                },
                error: function () {
                    if (oTable) { oTable.setBusy(false); }
                    MessageBox.error("Failed to load open items");
                }
            });
        },

        // _updateTableTitles: function () {
        //     const oModel = this.getView().getModel("openItems");
        //     const aOpenItems        = oModel.getProperty("/openItems")        || [];
        //     const aItemsToBeCleared = oModel.getProperty("/itemsToBeCleared") || [];

        //     const oOpenTitle  = this.byId("dp_openItemsTitle");
        //     const oClearTitle = this.byId("dp_itemsToClearTitle");
        //     if (oOpenTitle)  { oOpenTitle.setText("Open Items (" + aOpenItems.length + ")"); }
        //     if (oClearTitle) { oClearTitle.setText("Items to Be Cleared (" + aItemsToBeCleared.length + ")"); }

        //     const fTotalInvoiceSum = aItemsToBeCleared.reduce(function (fSum, oItem) {
        //         const f = parseFloat(oItem.amntLC);
        //         return fSum + (isNaN(f) ? 0 : f);   // ← safe parse
        //     }, 0);

        //     const oPayInput = this.byId("dp_payAmountInput");
        //     const fPayAmnt  = oPayInput ? (parseFloat(oPayInput.getValue()) || 0) : 0;
        //     const fBalance  = fPayAmnt - fTotalInvoiceSum;

        //     const oInvoiceInput = this.byId("dp_invoiceSumInput");
        //     if (oInvoiceInput) { oInvoiceInput.setValue(fTotalInvoiceSum.toFixed(3)); }

        //     const oBalanceInput = this.byId("dp_balanceInput");
        //     if (oBalanceInput) {
        //         oBalanceInput.setValue(fBalance.toFixed(3));
        //         oBalanceInput.setValueState(
        //             Math.abs(fBalance) < 0.001
        //                 ? sap.ui.core.ValueState.None
        //                 : sap.ui.core.ValueState.Error
        //         );
        //         oBalanceInput.setValueStateText("Balance must be zero to save");
        //     }
        // },
        _updateTableTitles: function () {
            const oModel = this.getView().getModel("openItems");
            const aOpenItems        = oModel.getProperty("/openItems")        || [];
            const aItemsToBeCleared = oModel.getProperty("/itemsToBeCleared") || [];

            const oOpenTitle  = this.byId("dp_openItemsTitle");
            const oClearTitle = this.byId("dp_itemsToClearTitle");
            if (oOpenTitle)  { oOpenTitle.setText("Open Items (" + aOpenItems.length + ")"); }
            if (oClearTitle) { oClearTitle.setText("Items to Be Cleared (" + aItemsToBeCleared.length + ")"); }

            const fTotalInvoiceSum = aItemsToBeCleared.reduce(function (fSum, oItem) {
                const f = parseFloat(oItem.amntLC);
                return fSum + (isNaN(f) ? 0 : f);
            }, 0);

            const oPayInput = this.byId("dp_payAmountInput");
            const fPayAmnt  = oPayInput ? (parseFloat(oPayInput.getValue()) || 0) : 0;
            const fBalance  = fPayAmnt - fTotalInvoiceSum;

            const oInvoiceInput = this.byId("dp_invoiceSumInput");
            if (oInvoiceInput) { oInvoiceInput.setValue(fTotalInvoiceSum.toFixed(3)); }

            const oBalanceInput = this.byId("dp_balanceInput");
            if (oBalanceInput) {
                oBalanceInput.setValue(fBalance.toFixed(3));
                oBalanceInput.setValueState(
                    Math.abs(fBalance) < 0.001
                        ? sap.ui.core.ValueState.None
                        : sap.ui.core.ValueState.Error
                );
                oBalanceInput.setValueStateText("Balance must be zero to save");
            }

            // ↓ ADD THIS BLOCK — sync pageModel if display form is currently shown
            if (this._bDisplayMode) {
                const oPageModel = this.getView().getModel("pageModel");
                if (oPageModel) {
                    oPageModel.setProperty("/invoiceSum", fTotalInvoiceSum.toFixed(3));
                    oPageModel.setProperty("/balance",    fBalance.toFixed(3));
                }
            }
        },

        onClearItem: function (oEvt) {
            const oContext = oEvt.getSource().getBindingContext("openItems");
            if (!oContext) { return; }
            const oModel   = this.getView().getModel("openItems");
            const iIndex   = parseInt(oContext.getPath().split("/").pop());
            const aOpen    = JSON.parse(JSON.stringify(oModel.getProperty("/openItems")));
            const aCleared = JSON.parse(JSON.stringify(oModel.getProperty("/itemsToBeCleared")));
            if (iIndex < 0 || iIndex >= aOpen.length) { return; }
            const oItem = aOpen.splice(iIndex, 1)[0];
            aCleared.push(oItem);
            oModel.setData({ openItems: aOpen, itemsToBeCleared: aCleared });
            this._updateTableTitles();
            MessageToast.show("Item moved to clearing: " + oItem.docNo);
        },

        onRemoveItem: function (oEvt) {
            const oContext = oEvt.getSource().getBindingContext("openItems");
            if (!oContext) { return; }
            const oModel   = this.getView().getModel("openItems");
            const iIndex   = parseInt(oContext.getPath().split("/").pop());
            const aCleared = JSON.parse(JSON.stringify(oModel.getProperty("/itemsToBeCleared")));
            const aOpen    = JSON.parse(JSON.stringify(oModel.getProperty("/openItems")));
            if (iIndex < 0 || iIndex >= aCleared.length) { return; }
            const oItem = aCleared.splice(iIndex, 1)[0];
            aOpen.push(oItem);
            oModel.setData({ openItems: aOpen, itemsToBeCleared: aCleared });
            const oTable = this.byId("dp_openItemsTable");
            if (oTable && oTable.getBinding("items")) { oTable.getBinding("items").refresh(); }
            this._updateTableTitles();
            MessageToast.show("Item moved back to open items: " + oItem.docNo);
        },

        onRefreshItems: function () {
            const oSearchField = this.byId("dp_searchField");
            if (oSearchField) { oSearchField.setValue(""); }

            const oTable = this.byId("dp_openItemsTable");
            if (oTable) {
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.filter([]);
                    oBinding.sort([]);
                }
            }

            this._aOriginalOpenItems = null;

            const sVendor = this.byId("dp_supplierAccountInput")
                ? this.byId("dp_supplierAccountInput").getValue().trim() : "";
            const sCurr = this.byId("dp_currencyInput")
                ? this.byId("dp_currencyInput").getValue().trim() : "";

            if (!sVendor) { MessageToast.show("Please enter a vendor first"); return; }
            if (!sCurr)   { MessageToast.show("Please enter a currency first"); return; }

            this._refreshOpenItemsOnly(sVendor);
        },

        _refreshOpenItemsOnly: function (sVendor) {
            const oDataModel = this.getOwnerComponent().getModel();
            const oJSONModel = this.getView().getModel("openItems");
            const that = this;
            const oTable = this.byId("dp_openItemsTable");
            if (oTable) { oTable.setBusy(true); }

            const sCurr = this.byId("dp_currencyInput") 
                ? this.byId("dp_currencyInput").getValue().trim() : "";

            if (!sCurr) {
                if (oTable) { oTable.setBusy(false); }
                MessageToast.show("Currency is missing, cannot refresh");
                return;
            }

            const aFilters = [
                new Filter("vendor", FilterOperator.EQ, sVendor),
                new Filter("docCurr",   FilterOperator.EQ, sCurr)
            ];

            oDataModel.read("/dprItems", {
                filters: aFilters,
                success: function (oData) {
                    if (oTable) { oTable.setBusy(false); }
                    const aAll     = oData.results || [];
                    const aCleared = oJSONModel.getProperty("/itemsToBeCleared") || [];
                    const oSet = new Set(
                        aCleared.map(function (o) {
                            return o.docNo + "|" + o.year1 + "|" + o.lineItem;
                        })
                    );
                    const aFiltered = aAll.filter(function (o) {
                        return !oSet.has(o.docNo + "|" + o.year1 + "|" + o.lineItem);
                    });
                    oJSONModel.setProperty("/openItems", aFiltered);
                    that._updateTableTitles();
                    MessageToast.show("Refreshed " + aFiltered.length + " open items");
                },
                error: function () {
                    if (oTable) { oTable.setBusy(false); }
                    MessageBox.error("Failed to refresh open items");
                }
            });
        },

        onSearchOpenItems: function (oEvt) {
            const sQuery   = oEvt.getSource().getValue().trim();
            const oModel   = this.getView().getModel("openItems");
            const oBinding = this.byId("dp_openItemsTable").getBinding("items");
            if (this._aOriginalOpenItems) {
                oModel.setProperty("/openItems", this._aOriginalOpenItems);
                this._aOriginalOpenItems = null;
            }
            oBinding.filter([]);
            if (!sQuery) { return; }
            const aAll = oModel.getProperty("/openItems");
            const sQ   = sQuery.toLowerCase();
            const aFiltered = aAll.filter(function (o) {
                return (o.docNo    && String(o.docNo).toLowerCase().indexOf(sQ)    > -1)
                    || (o.year1    && String(o.year1).toLowerCase().indexOf(sQ)    > -1)  // ← year1
                    || (o.lineItem && String(o.lineItem).toLowerCase().indexOf(sQ) > -1)
                    || (o.compCode && String(o.compCode).toLowerCase().indexOf(sQ) > -1)
                    || (o.vendor   && String(o.vendor).toLowerCase().indexOf(sQ)   > -1)  // ← vendor
                    || (o.refNo    && String(o.refNo).toLowerCase().indexOf(sQ)    > -1)  // ← refNo
                    || (o.assignNo && String(o.assignNo).toLowerCase().indexOf(sQ) > -1)
                    || (o.amntLC   && String(o.amntLC).toLowerCase().indexOf(sQ)   > -1)
                    || (o.amntDC   && String(o.amntDC).toLowerCase().indexOf(sQ)   > -1)
                    || (o.curr     && String(o.curr).toLowerCase().indexOf(sQ)     > -1); // ← curr
            });
            this._aOriginalOpenItems = aAll;
            oModel.setProperty("/openItems", aFiltered);
        },

      onOpenViewSettings: function () {
        const that = this;
        if (!this._oViewSettingsDialogDP) {
            this.loadFragment({
                name: "zfi.payment.management.fragments.DpFrag.ViewSettingsDialogDP"
            }).then(function (oDialog) {
                that._oViewSettingsDialogDP = oDialog;
                that.getView().addDependent(oDialog);
                oDialog.open();
            });
        } else {
            this._oViewSettingsDialogDP.open();
        }
    },
        onFilterFieldChange: function () {
            const sKey        = this.byId("filterFieldSelectdp").getSelectedKey();
            // No date fields in dprItems entity — kept for future use
            const aDateFields = [];
            const bIsDate     = aDateFields.indexOf(sKey) > -1;

            const oInput      = this.byId("filterValueInputdp");
            const oDatePicker = this.byId("filterDatePickerdp");
            const oOperator   = this.byId("filterOperatorSelectdp");

            // Restore original items before resetting filter
            const oModel = this.getView().getModel("openItems");
            if (this._aOriginalOpenItems) {
                oModel.setProperty("/openItems", this._aOriginalOpenItems);
                this._aOriginalOpenItems = null;
            }
            const oBinding = this.byId("dp_openItemsTable").getBinding("items");
            if (oBinding) { oBinding.filter([]); }

            oInput.setVisible(!bIsDate);
            oDatePicker.setVisible(bIsDate);

            if (bIsDate) {
                oOperator.setSelectedKey("EQ");
                oOperator.setEnabled(false);
            } else {
                oOperator.setEnabled(true);
            }

            oInput.setValue("");
            oDatePicker.setDateValue(null);
        },
        onViewSettingsConfirm: function () {
        const oTable   = this.byId("dp_openItemsTable");
        const oBinding = oTable.getBinding("items");
        const oModel   = this.getView().getModel("openItems");

        // Restore original items before applying new filter
        if (this._aOriginalOpenItems) {
            oModel.setProperty("/openItems", this._aOriginalOpenItems);
            this._aOriginalOpenItems = null;
        }

        // ── Sort ──────────────────────────────────────────────────────────────
        const sSortField = this.byId("sortFieldSelectdp").getSelectedKey();
        const bDesc      = this.byId("sortOrderBtndp").getSelectedKey() === "desc";
        const aSorters   = sSortField
            ? [new sap.ui.model.Sorter(sSortField, bDesc)]
            : [];

        // ── Filter ────────────────────────────────────────────────────────────
        const sFilterField    = this.byId("filterFieldSelectdp").getSelectedKey();
        const sFilterOperator = this.byId("filterOperatorSelectdp").getSelectedKey();
        const sFilterValue    = this.byId("filterValueInputdp").getValue().trim();

        let aFilters = [];

        if (sFilterField && sFilterValue) {
            const oOperator = sap.ui.model.FilterOperator[sFilterOperator];
            aFilters.push(new sap.ui.model.Filter(sFilterField, oOperator, sFilterValue));
        }

        oBinding.sort(aSorters);
        oBinding.filter(aFilters);
        this._oViewSettingsDialogDP.close();   // ← fixed capital P typo
    },

    onViewSettingsReset: function () {
        const oModel = this.getView().getModel("openItems");

        if (this._aOriginalOpenItems) {
            oModel.setProperty("/openItems", this._aOriginalOpenItems);
            this._aOriginalOpenItems = null;
        }

        this.byId("sortFieldSelectdp").setSelectedKey("");
        this.byId("sortOrderBtndp").setSelectedKey("asc");

        this.byId("filterFieldSelectdp").setSelectedKey("");
        this.byId("filterOperatorSelectdp").setSelectedKey("Contains");
        this.byId("filterOperatorSelectdp").setEnabled(true);
        this.byId("filterValueInputdp").setValue("");
        this.byId("filterValueInputdp").setVisible(true);
        this.byId("filterDatePickerdp").setDateValue(null);
        this.byId("filterDatePickerdp").setVisible(false);

        const oBinding = this.byId("dp_openItemsTable").getBinding("items");
        if (oBinding) {
            oBinding.sort([]);
            oBinding.filter([]);
        }

        this._oViewSettingsDialogDP.close();
    },

    onViewSettingsCancel: function () {
        this._oViewSettingsDialogDP.close();
    },

        onPayAmountChange: function () {
            this._updateTableTitles();
        },

        formatDate: function (value) {
            if (value) {
                return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" }).format(new Date(value));
            }
            return "";
        },

  

        _setBusyDialog: function (bOpen) {
            if (bOpen) {
                if (!this._oBusyDialog) {
                    this._oBusyDialog = new sap.m.BusyDialog({ title: "Please Wait", text: "Processing..." });
                }
                this._oBusyDialog.open();
            } else {
                if (this._oBusyDialog) { this._oBusyDialog.close(); }
            }
        },

        _toODataDate: function (value) {
            
            if (!value) { return null; }
            if (value instanceof Date) { return "/Date(" + value.getTime() + ")/"; }
            if (typeof value === "string" && value.indexOf("/Date(") === 0) { return value; }
            if (typeof value === "string" && value.indexOf("T") > -1) {
                const d = new Date(value);
                if (!isNaN(d.getTime())) { return "/Date(" + d.getTime() + ")/"; }
            }
            return null;
        },

        _toODataDate2: function (value) {
            if (!value) { return null; }
            var date1 = value.toDateString();
            var time1 = new Date().toTimeString();
            var timest1 = date1 + " " + time1;
            return new Date(timest1);
            //value.setTime(new Date().getTime());
            // if (value instanceof Date) { return "/Date(" + value.getTime() + ")/"; }
            // if (typeof value === "string" && value.indexOf("/Date(") === 0) { return value; }
            // if (typeof value === "string" && value.indexOf("T") > -1) {
            //     const d = new Date(value);
            //     if (!isNaN(d.getTime())) { return "/Date(" + d.getTime() + ")/"; }
            // }
            // return null;
        },

        _collectFormValues: function () {
            const g = function (sId) {
                const o = this.byId(sId);
                return o ? o.getValue().trim() : "";
            }.bind(this);
            return {
                sCompCode:  g("dp_companyCodeInput"),
                sFiscYear:  g("dp_fiscalYearInput"),
                sReference: g("dp_referenceInput"),
                sHeadText:  g("dp_headerTextInput"),
                sBankKey:   g("dp_houseBankInput"),
                sBankAcc:   g("dp_houseBankAccountInput"),
                sVendor:    g("dp_supplierAccountInput"),
                sPayAmnt:   g("dp_payAmountInput") || "0",
                sBankGL:    g("dp_glAccountInput"),
                sCurrency:  g("dp_currencyInput"),
                sSpGL:      g("dp_glvh"),  
                oDocDate:   this.byId("dp_documentDatePicker")  ? this.byId("dp_documentDatePicker").getDateValue()  : null,
                oPostDate:  this.byId("dp_postingDatePicker")   ? this.byId("dp_postingDatePicker").getDateValue()   : null
            };
        },

        _buildToItems: function (aItemsToBeCleared, sCompCode) {
            const that = this;
            return aItemsToBeCleared.map(function (oItem, iIndex) {
                const fnAmt = function (v) {
                    const f = parseFloat(v);
                    return isNaN(f) ? "0.000" : f.toFixed(3);
                };
                return {
                    itemId:      String(iIndex + 1).padStart(3, "0"),
                    itemTy:      "2",
                    amntLC:      fnAmt(oItem.amntLC),   // ← consistent 3dp string
                    amntDC:      fnAmt(oItem.amntDC),   // ← consistent 3dp string
                    compCode:    oItem.compCode || sCompCode,
                    refDoc:      oItem.docNo,
                    refYear:     oItem.year1,
                    refLine:     oItem.lineItem,
                    docType:     oItem.docType  || "",
                    baseDate:    that._toODataDate(oItem.baseDate),
                    extRef:      oItem.refNo    || "",
                    assignNo:    oItem.assignNo || "",
                    docCurr:      oItem.docCurr,
                    compCurr:      oItem.compCurr,  
                    postingDate: that._toODataDate(oItem.postingDate)
                };
            });
        },
        _validateAndGetData: function (sAction) {
            const f = this._collectFormValues();
            if (!f.sCompCode || !f.sFiscYear || !f.sVendor || !f.sBankKey || !f.sBankAcc || !f.oDocDate || !f.oPostDate) {
                MessageBox.error("Please fill all required fields.");
                return null;
            }
            const oModel = this.getView().getModel("openItems");
            const aItems = oModel.getProperty("/itemsToBeCleared");
            if (aItems.length === 0) {
                MessageBox.error("Please move at least one item to 'Items to Be Cleared'.");
                return null;
            }
            const fSum     = aItems.reduce(function (s, o) { return s + (parseFloat(o.amntLC) || 0); }, 0);
            const fPay     = parseFloat(f.sPayAmnt) || 0;
            const fBalance = fPay - fSum;
            if (Math.abs(fBalance) >= 0.001) {
                MessageBox.error("Balance must be zero.\nPayment: " + fPay.toFixed(3) + "\nInvoice: " + fSum.toFixed(3) + "\nBalance: " + fBalance.toFixed(3));
                return null;
            }
            return {
                payload: {
                    compCode:    f.sCompCode,
                    fiscYear:    f.sFiscYear,
                    draftType:   "2",
                    docDate:     this._toODataDate2(f.oDocDate),
                    postingDate: this._toODataDate2(f.oPostDate),
                    reference:   f.sReference,
                    headText:    f.sHeadText,
                    bankKey:     f.sBankKey,
                    bankAcc:     f.sBankAcc,
                    bankGL:      f.sBankGL,
                    vendor:      f.sVendor,
                    curr:        f.sCurrency,
                     spGL:        f.sSpGL, 
                    payAmnt:     parseFloat(f.sPayAmnt).toFixed(3),
                    action:      sAction,
                    to_item:     this._buildToItems(aItems, f.sCompCode)
                }
            };
        },

        onSave: function () {
            const that = this;
            const oResult = this._validateAndGetData("I");
            if (!oResult) { return; }

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);
            oDataModel.create("/head", oResult.payload, {
                success: function (oData) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    const sDraftId = oData.draftId;
                    const oInput = that.byId("dp_draftidInput");
                    if (oInput && sDraftId) { oInput.setValue(sDraftId); }
                    that.getView().getModel("pageModel").setData({ mode: "edit", draftId: sDraftId });
                    const oSave   = that.byId("dp_saveButton");
                    const oUpdate = that.byId("dp_updateButton");
                    if (oSave)   { oSave.setVisible(false);   }
                    if (oUpdate) { oUpdate.setVisible(true);  }
                    MessageToast.show("Saved successfully. Draft ID: " + sDraftId);
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    let sMsg = "Failed to save";
                    try { sMsg = JSON.parse(oError.responseText).error.message.value || sMsg; } catch (e) { /* ignore */ }
                    MessageBox.error(sMsg);
                }
            });
        },

        onUpdate: function () {
            const that = this;
            const sDraftId = this.getView().getModel("pageModel").getProperty("/draftId");
            const oResult  = this._validateAndGetData("U");
            if (!oResult) { return; }
            oResult.payload.draftId = sDraftId;

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);
            oDataModel.create("/head", oResult.payload, {
                success: function () {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    MessageToast.show("Updated successfully. Draft ID: " + sDraftId);
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    let sMsg = "Failed to update";
                    try { sMsg = JSON.parse(oError.responseText).error.message.value || sMsg; } catch (e) { /* ignore */ }
                    MessageBox.error(sMsg);
                }
            });
        },

        onSubmit: function () {
            const that        = this;
            const oPageModel  = this.getView().getModel("pageModel");
            const sMode       = oPageModel.getProperty("/mode");
            const sDraftId    = oPageModel.getProperty("/draftId");
            const oDataModel  = this.getOwnerComponent().getModel();

            const fnSubmit = function (sId) {
                oDataModel.setUseBatch(false);
                that._setBusyDialog(true);
                oDataModel.create("/head", { draftId: sId, action: "S" }, {
                    success: function () {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        MessageBox.success("Submitted successfully. Draft ID: " + sId, {
                            onClose: function () { that.getOwnerComponent().getRouter().navTo("RouteNewDoc"); }
                        });
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        let sMsg = "Failed to submit";
                        try { sMsg = JSON.parse(oError.responseText).error.message.value || sMsg; } catch (e) { /* ignore */ }
                        MessageBox.error(sMsg);
                    }
                });
            };

            if (sMode === "edit") {
                that.onUpdate();
                fnSubmit(sDraftId);
            } else {
                that.onSave();
                let iAttempts = 0;
                const oInterval = setInterval(function () {
                    iAttempts++;
                    const sNewId = that.getView().getModel("pageModel").getProperty("/draftId");
                    if (sNewId) { clearInterval(oInterval); fnSubmit(sNewId); }
                    else if (iAttempts >= 20) { clearInterval(oInterval); that._setBusyDialog(false); MessageBox.error("Save timed out. Please try again."); }
                }, 500);
            }
        },

        onPost: function () {
            const that       = this;
            const sDraftId   = this.getView().getModel("pageModel").getProperty("/draftId");
            const oDataModel = this.getOwnerComponent().getModel();
            if (!sDraftId) { MessageBox.error("Draft ID not found. Cannot post."); return; }

            MessageBox.confirm("Are you sure you want to post this payment?", {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }
                    oDataModel.setUseBatch(false);
                    that._setBusyDialog(true);
                    oDataModel.create("/head", { draftId: sDraftId, action: "P" }, {
                        success: function (oData) {
                            that._setBusyDialog(false);
                            oDataModel.setUseBatch(true);
                            if (oData.procStat === "E") {
                                MessageBox.error(oData.msg, { onClose: function () { that.getOwnerComponent().getRouter().navTo("RouteNewDoc"); } });
                            } else {
                                MessageBox.success("Document " + oData.postdoc + " posted successfully.", { onClose: function () { that.getOwnerComponent().getRouter().navTo("RouteNewDoc"); } });
                            }
                        },
                        error: function (oError) {
                            that._setBusyDialog(false);
                            oDataModel.setUseBatch(true);
                            let sMsg = "Failed to post";
                            try { sMsg = JSON.parse(oError.responseText).error.message.value || sMsg; } catch (e) { /* ignore */ }
                            MessageBox.error(sMsg);
                        }
                    });
                }
            });
        },

        onResubmit: function () {
            const that       = this;
            const sDraftId   = this.getView().getModel("pageModel").getProperty("/draftId");
            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);
            oDataModel.create("/head", { draftId: sDraftId, action: "R" }, {
                success: function () {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    MessageBox.success("Resubmitted successfully.", { onClose: function () { that.getOwnerComponent().getRouter().navTo("RouteNewDoc"); } });
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    let sMsg = "Failed to resubmit";
                    try { sMsg = JSON.parse(oError.responseText).error.message.value || sMsg; } catch (e) { /* ignore */ }
                    MessageBox.error(sMsg);
                }
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteNewDoc");
        }
    });
});