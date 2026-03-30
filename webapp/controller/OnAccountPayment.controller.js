sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../modules/InputHelpsOA"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, InputHelpsOA) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.OnAccountPayment", {
        InputHelpsOA: InputHelpsOA,

        // ─────────────────────────────────────────────────────────────────────
        // Init & Routing
        // ─────────────────────────────────────────────────────────────────────
        onInit: function () {
            const oPageModel = new JSONModel({
                mode:    "create",
                draftId: null
            });
            this.getView().setModel(oPageModel, "pageModel");

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteOnAccountPayment").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            const oArgs    = oEvent.getParameter("arguments");
            const sDraftId = oArgs.draftId;

            if (sDraftId && sDraftId !== "new") {
                this.getView().getModel("pageModel").setData({
                    mode:    "edit",
                    draftId: sDraftId
                });
                this._loadDraft(sDraftId);
            } else {
                this.getView().getModel("pageModel").setData({
                    mode:    "create",
                    draftId: null
                });
                this._resetPage();
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Navigation
        // ─────────────────────────────────────────────────────────────────────
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteNewDoc");
        },

        // ─────────────────────────────────────────────────────────────────────
        // Reset page (Create mode)
        // ─────────────────────────────────────────────────────────────────────
        _resetPage: function () {
            const aInputIds = [
                "oa_draftidInput",
                "oa_companyCodeInput",
                "oa_fiscalYearInput",
                "oa_referenceInput",
                "oa_headerTextInput",        // matches fragment: oa_headerTextInput
                "oa_houseBankInput",
                "oa_houseBankAccountInput",
                "oa_glAccountInput",
                "oa_supplierAccountInput",
                "oa_currencyInput",
                "oa_payAmountInput",         // matches fragment: oa_payAmountInput
                "oa_invoiceSumInput",
                "oa_balanceInput"
            ];

            aInputIds.forEach(function (sId) {
                const oControl = this.byId(sId);
                if (oControl) {
                    oControl.setValue("");
                    if (oControl.setValueState) {
                        oControl.setValueState(sap.ui.core.ValueState.None);
                    }
                }
            }.bind(this));

            const oDocPicker  = this.byId("oa_documentDatePicker");
            const oPostPicker = this.byId("oa_postingDatePicker");
            if (oDocPicker)  { oDocPicker.setValue("");  }
            if (oPostPicker) { oPostPicker.setValue(""); }

            this._applyDisplayMode("");
            this._updateSaveButton("create");
        },

        // ─────────────────────────────────────────────────────────────────────
        // Save / Update button visibility
        // ─────────────────────────────────────────────────────────────────────
        _updateSaveButton: function (sMode) {
            const sDraftSt = this.getView().getModel("pageModel").getProperty("/draftSt");
            if (sDraftSt === "2" || sDraftSt === "3") { return; }

            const oSaveButton   = this.byId("_IDGenButton25oa");
            const oUpdateButton = this.byId("_IDGenButton27oa");
            if (oSaveButton)   { oSaveButton.setVisible(sMode !== "edit");  }
            if (oUpdateButton) { oUpdateButton.setVisible(sMode === "edit"); }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Load draft (Edit mode)
        // ─────────────────────────────────────────────────────────────────────
        _loadDraft: function (sDraftId) {
            const oDataModel = this.getOwnerComponent().getModel();
            const that = this;

            this.getView().setBusy(true);

            oDataModel.read("/head('" + sDraftId + "')", {
                success: function (oHead) {
                    that.getView().setBusy(false);
                    that._populateFormFields(oHead);

                    // Load approvers for statuses 2–6
                    if (oHead.draftSt === "2" || oHead.draftSt === "3" ||
                        oHead.draftSt === "4" || oHead.draftSt === "5" || oHead.draftSt === "6") {

                        const aApFilters = [new Filter("draftID", FilterOperator.EQ, sDraftId)];
                        oDataModel.read("/aprvrs", {
                            filters: aApFilters,
                            success: function (oData) {
                                const oAprvrModel = new JSONModel(oData.results);
                                that.getView().setModel(oAprvrModel, "aprvrTab");
                                const oAprvrTable = that.byId("oa_aprvrTable");
                                if (oAprvrTable) { oAprvrTable.setVisible(true); }
                            },
                            error: function (oErr) {
                                console.error("Approvers load error:", JSON.stringify(oErr));
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

        // ─────────────────────────────────────────────────────────────────────
        // Populate form fields from backend data
        // ─────────────────────────────────────────────────────────────────────
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

                if (oDate && !isNaN(oDate.getTime())) {
                    oCtrl.setDateValue(oDate);
                } else {
                    console.warn("Could not parse date for [" + sId + "], raw:", value);
                }
            }.bind(this);

            // Map backend fields → fragment input IDs
            fnSet("oa_draftidInput",          oHead.draftId);
            fnSet("oa_companyCodeInput",       oHead.compCode);
            fnSet("oa_fiscalYearInput",        oHead.fiscYear);
            fnSet("oa_referenceInput",         oHead.reference);
            fnSet("oa_headerTextInput",        oHead.headText);   // oa_headerTextInput
            fnSet("oa_houseBankInput",         oHead.bankKey);
            fnSet("oa_houseBankAccountInput",  oHead.bankAcc);
            fnSet("oa_glAccountInput",         oHead.bankGL);
            fnSet("oa_supplierAccountInput",   oHead.vendor);
            fnSet("oa_currencyInput",          oHead.curr);
            fnSet("oa_payAmountInput",         oHead.payAmnt);    // oa_payAmountInput
            fnSetDate("oa_documentDatePicker", oHead.docDate);
            fnSetDate("oa_postingDatePicker",  oHead.postingDate);

            const oPageModel = this.getView().getModel("pageModel");
            oPageModel.setProperty("/postDoc", oHead.postDoc || "");
            oPageModel.setProperty("/msg",     oHead.msg     || "");
            oPageModel.setProperty("/draftSt", oHead.draftSt || "");

            this._applyDisplayMode(oHead.draftSt);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Display mode: show/hide forms & buttons based on draft status
        // ─────────────────────────────────────────────────────────────────────
        _applyDisplayMode: function (sDraftSt) {
            const bIsInApproval = sDraftSt === "2";
            const bIsCreated    = sDraftSt === "1";
            const bIsApproved   = sDraftSt === "3";
            const bIsRejected   = sDraftSt === "4";
            const bIsPosted     = sDraftSt === "5";
            const bIsPostErr    = sDraftSt === "6";
            const bDisplayForm  = bIsInApproval || bIsApproved || bIsPosted || bIsPostErr;

            // Toggle edit / display form boxes
            const oEditFormBox    = this.byId("oa_editFormBox");
            const oDisplayFormBox = this.byId("oa_displayFormBox");
            if (oEditFormBox)    { oEditFormBox.setVisible(!bDisplayForm);  }
            if (oDisplayFormBox) { oDisplayFormBox.setVisible(bDisplayForm); }

            // Populate display fragment pageModel properties
            if (bDisplayForm) {
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

                oPageModel.setProperty("/compCode",    fnGet("oa_companyCodeInput"));
                oPageModel.setProperty("/fiscYear",    fnGet("oa_fiscalYearInput"));
                oPageModel.setProperty("/reference",   fnGet("oa_referenceInput"));
                oPageModel.setProperty("/headText",    fnGet("oa_headerTextInput"));
                oPageModel.setProperty("/bankKey",     fnGet("oa_houseBankInput"));
                oPageModel.setProperty("/bankAcc",     fnGet("oa_houseBankAccountInput"));
                oPageModel.setProperty("/bankGL",      fnGet("oa_glAccountInput"));
                oPageModel.setProperty("/vendor",      fnGet("oa_supplierAccountInput"));
                oPageModel.setProperty("/curr",        fnGet("oa_currencyInput"));
                oPageModel.setProperty("/payAmnt",     fnGet("oa_payAmountInput"));
                oPageModel.setProperty("/docDate",     fnGetDate("oa_documentDatePicker"));
                oPageModel.setProperty("/postingDate", fnGetDate("oa_postingDatePicker"));
            }

            // Fields always locked
            const aAlwaysLockedIds = [
                "oa_supplierAccountInput", "oa_companyCodeInput",
                "oa_houseBankInput", "oa_houseBankAccountInput", "oa_glAccountInput"
            ];

            // Fields editable in Created / Rejected modes
            const aEditableIds = [
                "oa_fiscalYearInput", "oa_referenceInput", "oa_headerTextInput",
                "oa_currencyInput", "oa_payAmountInput",
                "oa_documentDatePicker", "oa_postingDatePicker"
            ];

            if (!bDisplayForm) {
                if (bIsCreated || bIsRejected) {
                    aAlwaysLockedIds.forEach(function (sId) {
                        const oCtrl = this.byId(sId);
                        if (oCtrl) { oCtrl.setEditable(false); }
                    }.bind(this));
                    aEditableIds.forEach(function (sId) {
                        const oCtrl = this.byId(sId);
                        if (oCtrl) { oCtrl.setEditable(true); }
                    }.bind(this));
                } else {
                    // Create mode — all editable
                    aAlwaysLockedIds.concat(aEditableIds).forEach(function (sId) {
                        const oCtrl = this.byId(sId);
                        if (oCtrl) { oCtrl.setEditable(true); }
                    }.bind(this));
                }
            }

            // Button & table references
            const oSaveButton     = this.byId("_IDGenButton25oa");
            const oUpdateButton   = this.byId("_IDGenButton27oa");
            const oSubmitButton   = this.byId("_IDGenButton26oa");
            const oPostButton     = this.byId("_IDGenButton2622oa");
            const oResubmitButton = this.byId("resubmitButtonoa");
            const oAprvrTable     = this.byId("oa_aprvrTable");

            if (bIsInApproval) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oResubmitButton) { oResubmitButton.setVisible(false);}
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
                this._setPostingInfoVisible(false, false);

            } else if (bIsApproved) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(true);     }
                if (oResubmitButton) { oResubmitButton.setVisible(false);}
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
                this._setPostingInfoVisible(false, false);

            } else if (bIsCreated) {
                if (oSaveButton)     { oSaveButton.setVisible(false);                           }
                if (oUpdateButton)   { oUpdateButton.setVisible(true);                          }
                if (oSubmitButton)   { oSubmitButton.setVisible(true); oSubmitButton.setText("Submit"); }
                if (oPostButton)     { oPostButton.setVisible(false);                           }
                if (oResubmitButton) { oResubmitButton.setVisible(false);                       }
                if (oAprvrTable)     { oAprvrTable.setVisible(false);                           }

            } else if (bIsRejected) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oResubmitButton) { oResubmitButton.setVisible(true); }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }

            } else if (bIsPostErr) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(true);     }
                if (oResubmitButton) { oResubmitButton.setVisible(false);}
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
                this._setPostingInfoVisible(false, true);  // show msg, hide postDoc

            } else if (bIsPosted) {
                if (oSaveButton)     { oSaveButton.setVisible(false);    }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);  }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oResubmitButton) { oResubmitButton.setVisible(false);}
                if (oAprvrTable)     { oAprvrTable.setVisible(true);     }
                this._setPostingInfoVisible(true, false);  // show postDoc, hide msg

            } else {
                // Create mode
                if (oSaveButton)     { oSaveButton.setVisible(true);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);  }
                if (oSubmitButton)   { oSubmitButton.setVisible(true);   }
                if (oPostButton)     { oPostButton.setVisible(false);    }
                if (oResubmitButton) { oResubmitButton.setVisible(false);}
                if (oAprvrTable)     { oAprvrTable.setVisible(false);    }
            }
        },

        _setPostingInfoVisible: function (bShowDoc, bShowMsg) {
            const oPostDocLabel = this.byId("oa_postdoclabel");
            const oPostDocText  = this.byId("oa_postdocText");
            const oPostMsgLabel = this.byId("oa_postmsglabel");
            const oPostMsgText  = this.byId("oa_postmsgText");
            if (oPostDocLabel) { oPostDocLabel.setVisible(bShowDoc); }
            if (oPostDocText)  { oPostDocText.setVisible(bShowDoc);  }
            if (oPostMsgLabel) { oPostMsgLabel.setVisible(bShowMsg); }
            if (oPostMsgText)  { oPostMsgText.setVisible(bShowMsg);  }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Collect form values — single source of truth for Save & Update
        // ─────────────────────────────────────────────────────────────────────
        _collectFormValues: function () {
            const fnVal = function (sId) {
                const oCtrl = this.byId(sId);
                return oCtrl ? oCtrl.getValue().trim() : "";
            }.bind(this);

            return {
                sCompCode:  fnVal("oa_companyCodeInput"),
                sFiscYear:  fnVal("oa_fiscalYearInput"),
                sReference: fnVal("oa_referenceInput"),
                sHeadText:  fnVal("oa_headerTextInput"),      // oa_headerTextInput
                sBankKey:   fnVal("oa_houseBankInput"),
                sBankAcc:   fnVal("oa_houseBankAccountInput"),
                sBankGL:    fnVal("oa_glAccountInput"),
                sVendor:    fnVal("oa_supplierAccountInput"),
                sCurrency:  fnVal("oa_currencyInput"),
                sPayAmnt:   fnVal("oa_payAmountInput"),        // oa_payAmountInput
                oDocDate:   this.byId("oa_documentDatePicker")
                                ? this.byId("oa_documentDatePicker").getDateValue()  : null,
                oPostDate:  this.byId("oa_postingDatePicker")
                                ? this.byId("oa_postingDatePicker").getDateValue()   : null
            };
        },

        _validateForm: function (oVals) {
            if (!oVals.sCompCode || !oVals.sFiscYear || !oVals.sVendor ||
                !oVals.sBankKey  || !oVals.sBankAcc  ||
                !oVals.oDocDate  || !oVals.oPostDate) {
                MessageBox.error("Please fill all required fields before saving.");
                return false;
            }
            return true;
        },

        // ─────────────────────────────────────────────────────────────────────
        // Build 4 static to_item entries
        //   amntLC  → Total Payment Amount from oa_payAmountInput
        //   compCode → Company Code from oa_companyCodeInput
        // ─────────────────────────────────────────────────────────────────────
        _buildToItems: function (sCompCode, sPayAmnt) {
            const sAmnt = parseFloat(sPayAmnt || "0").toFixed(3);
            return [
                { itemId: "001", itemTy: "1", amntLC: sAmnt, compCode: sCompCode },
                // { itemId: "002", itemTy: "1", amntLC: sAmnt, compCode: sCompCode },
                // { itemId: "003", itemTy: "1", amntLC: sAmnt, compCode: sCompCode },
                // { itemId: "004", itemTy: "1", amntLC: sAmnt, compCode: sCompCode }
            ];
        },

        // ─────────────────────────────────────────────────────────────────────
        // OData date conversion helper
        // ─────────────────────────────────────────────────────────────────────
        _toODataDate: function (value) {
            if (!value) { return null; }
            if (value instanceof Date) { return "/Date(" + value.getTime() + ")/"; }
            if (typeof value === "string" && value.indexOf("/Date(") === 0) { return value; }
            if (typeof value === "string" && value.indexOf("T") > -1) {
                const oDate = new Date(value);
                if (!isNaN(oDate.getTime())) { return "/Date(" + oDate.getTime() + ")/"; }
            }
            if (typeof value === "string" && value.indexOf("/") > -1 && value.length === 10) {
                const aParts = value.split("/");
                const oDate  = new Date(parseInt(aParts[2]), parseInt(aParts[0]) - 1, parseInt(aParts[1]));
                if (!isNaN(oDate.getTime())) { return "/Date(" + oDate.getTime() + ")/"; }
            }
            return null;
        },

        // ─────────────────────────────────────────────────────────────────────
        // Busy dialog
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // Error handler
        // ─────────────────────────────────────────────────────────────────────
        _showError: function (oError, sDefaultMsg) {
            let sMsg = sDefaultMsg;
            if (oError && oError.responseText) {
                try {
                    const oResp = JSON.parse(oError.responseText);
                    if (oResp.error && oResp.error.message && oResp.error.message.value) {
                        sMsg = oResp.error.message.value;
                    }
                } catch (e) {
                    sMsg = oError.message || sMsg;
                }
            }
            MessageBox.error(sMsg);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Pay Amount change — recalculate balance display
        // ─────────────────────────────────────────────────────────────────────
        onPayAmountChange: function () {
            const oPayInput     = this.byId("oa_payAmountInput");
            const oInvSumInput  = this.byId("oa_invoiceSumInput");
            const oBalanceInput = this.byId("oa_balanceInput");

            const fPayAmnt    = parseFloat(oPayInput    ? oPayInput.getValue()    : "0") || 0;
            const fInvoiceSum = parseFloat(oInvSumInput ? oInvSumInput.getValue() : "0") || 0;
            const fBalance    = fPayAmnt - fInvoiceSum;

            if (oBalanceInput) {
                oBalanceInput.setValue(fBalance.toFixed(3));
                oBalanceInput.setValueState(
                    Math.abs(fBalance) < 0.001
                        ? sap.ui.core.ValueState.None
                        : sap.ui.core.ValueState.Warning
                );
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Save (Create — action "I")
        // ─────────────────────────────────────────────────────────────────────
        onSave: function () {
            const that  = this;
            const oVals = this._collectFormValues();
            if (!this._validateForm(oVals)) { return; }

            const oPayload = {
                compCode:    oVals.sCompCode,
                fiscYear:    oVals.sFiscYear,
                draftType:   "3",
                docDate:     this._toODataDate(oVals.oDocDate),
                postingDate: this._toODataDate(oVals.oPostDate),
                reference:   oVals.sReference,
                headText:    oVals.sHeadText,
                bankKey:     oVals.sBankKey,
                bankAcc:     oVals.sBankAcc,
                bankGL:      oVals.sBankGL,
                vendor:      oVals.sVendor,
                curr:        oVals.sCurrency,
                payAmnt:     parseFloat(oVals.sPayAmnt || "0").toFixed(3),
                action:      "I",
                to_item:     this._buildToItems(oVals.sCompCode, oVals.sPayAmnt)
            };

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);

            oDataModel.create("/head", oPayload, {
                success: function (oCreatedData) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);

                    const sDraftId      = oCreatedData.draftId;
                    const oDraftIdInput = that.byId("oa_draftidInput");
                    if (oDraftIdInput && sDraftId) { oDraftIdInput.setValue(sDraftId); }

                    that.getView().getModel("pageModel").setData({ mode: "edit", draftId: sDraftId });
                    that._updateSaveButton("edit");
                    MessageToast.show("Saved successfully. Draft ID: " + sDraftId);
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    that._showError(oError, "Failed to save payment");
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Update (action "U")
        // ─────────────────────────────────────────────────────────────────────
        onUpdate: function () {
            const that          = this;
            const oPageModel    = this.getView().getModel("pageModel");
            const sSavedDraftId = oPageModel.getProperty("/draftId");
            const oVals         = this._collectFormValues();
            if (!this._validateForm(oVals)) { return; }

            const oPayload = {
                draftId:     sSavedDraftId,
                compCode:    oVals.sCompCode,
                fiscYear:    oVals.sFiscYear,
                draftType:   "3",
                docDate:     this._toODataDate(oVals.oDocDate),
                postingDate: this._toODataDate(oVals.oPostDate),
                reference:   oVals.sReference,
                headText:    oVals.sHeadText,
                bankKey:     oVals.sBankKey,
                bankAcc:     oVals.sBankAcc,
                bankGL:      oVals.sBankGL,
                vendor:      oVals.sVendor,
                curr:        oVals.sCurrency,
                payAmnt:     parseFloat(oVals.sPayAmnt || "0").toFixed(3),
                action:      "U",
                to_item:     this._buildToItems(oVals.sCompCode, oVals.sPayAmnt)
            };

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);

            oDataModel.create("/head", oPayload, {
                success: function () {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    MessageToast.show("Updated successfully. Draft ID: " + sSavedDraftId);
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    that._showError(oError, "Failed to update payment");
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Submit (action "S")
        // ─────────────────────────────────────────────────────────────────────
        onSubmit: function () {
            const that          = this;
            const oPageModel    = this.getView().getModel("pageModel");
            const sMode         = oPageModel.getProperty("/mode");
            const sSavedDraftId = oPageModel.getProperty("/draftId");
            const oDataModel    = this.getOwnerComponent().getModel();

            const fnSubmit = function (sDraftId) {
                oDataModel.setUseBatch(false);
                that._setBusyDialog(true);
                oDataModel.create("/head", { draftId: sDraftId, action: "S" }, {
                    success: function () {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        MessageBox.success("Payment submitted successfully. Draft ID: " + sDraftId, {
                            onClose: function () {
                                that.getOwnerComponent().getRouter().navTo("RouteNewDoc");
                            }
                        });
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        that._showError(oError, "Failed to submit payment");
                    }
                });
            };

            if (sMode === "edit") {
                that.onUpdate();
                fnSubmit(sSavedDraftId);
            } else {
                that.onSave();
                const iMaxAttempts = 20;
                let   iAttempts    = 0;
                const oInterval    = setInterval(function () {
                    iAttempts++;
                    const sNewDraftId = that.getView().getModel("pageModel").getProperty("/draftId");
                    if (sNewDraftId) {
                        clearInterval(oInterval);
                        fnSubmit(sNewDraftId);
                    } else if (iAttempts >= iMaxAttempts) {
                        clearInterval(oInterval);
                        that._setBusyDialog(false);
                        MessageBox.error("Save did not complete in time. Please try submitting again.");
                    }
                }, 500);
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Post (action "P")
        // ─────────────────────────────────────────────────────────────────────
        onPost: function () {
            const that       = this;
            const oPageModel = this.getView().getModel("pageModel");
            const sDraftId   = oPageModel.getProperty("/draftId");
            const oDataModel = this.getOwnerComponent().getModel();

            if (!sDraftId) {
                MessageBox.error("Draft ID not found. Cannot post.");
                return;
            }

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
                                MessageBox.error(oData.msg, {
                                    onClose: function () {
                                        that.getOwnerComponent().getRouter().navTo("RouteNewDoc");
                                    }
                                });
                            } else {
                                MessageBox.success(
                                    "Document " + oData.postdoc + " posted successfully for Draft ID: " + sDraftId,
                                    {
                                        onClose: function () {
                                            that.getOwnerComponent().getRouter().navTo("RouteNewDoc");
                                        }
                                    }
                                );
                            }
                        },
                        error: function (oError) {
                            that._setBusyDialog(false);
                            oDataModel.setUseBatch(true);
                            that._showError(oError, "Failed to post payment");
                        }
                    });
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Resubmit (action "R")
        // ─────────────────────────────────────────────────────────────────────
        onResubmit: function () {
            const that          = this;
            const oPageModel    = this.getView().getModel("pageModel");
            const sMode         = oPageModel.getProperty("/mode");
            const sSavedDraftId = oPageModel.getProperty("/draftId");
            const oDataModel    = this.getOwnerComponent().getModel();

            const fnSubmit = function (sDraftId) {
                oDataModel.setUseBatch(false);
                that._setBusyDialog(true);
                oDataModel.create("/head", { draftId: sDraftId, action: "R" }, {
                    success: function () {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        MessageBox.success("Payment resubmitted successfully. Draft ID: " + sDraftId, {
                            onClose: function () {
                                that.getOwnerComponent().getRouter().navTo("RouteNewDoc");
                            }
                        });
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        that._showError(oError, "Failed to resubmit payment");
                    }
                });
            };

            if (sMode === "edit") {
                that.onUpdate();
                fnSubmit(sSavedDraftId);
            } else {
                that.onSave();
                const iMaxAttempts = 20;
                let   iAttempts    = 0;
                const oInterval    = setInterval(function () {
                    iAttempts++;
                    const sNewDraftId = that.getView().getModel("pageModel").getProperty("/draftId");
                    if (sNewDraftId) {
                        clearInterval(oInterval);
                        fnSubmit(sNewDraftId);
                    } else if (iAttempts >= iMaxAttempts) {
                        clearInterval(oInterval);
                        that._setBusyDialog(false);
                        MessageBox.error("Save did not complete in time. Please try resubmitting again.");
                    }
                }, 500);
            }
        }

    });
});