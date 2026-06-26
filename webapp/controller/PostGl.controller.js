sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../modules/InputHelpsPGL"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, InputHelpsPGL) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.PostGL", {
        InputHelpsPGL: InputHelpsPGL,

        // ─────────────────────────────────────────────────────────────────────
        // Init & Routing
        // ─────────────────────────────────────────────────────────────────────
        onInit: function () {
            const oPageModel = new JSONModel({
                mode:         "create",
                draftId:      null,
                supplierName: ""
            });
            this.getView().setModel(oPageModel, "pageModel");
            this._initLineItemsModel();
            this._iSelectedLineItemIndex = -1;
            this._sLineItemMode          = "add";

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RoutePostGl").attachMatched(this._onRouteMatched, this);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Route matched
        // ─────────────────────────────────────────────────────────────────────
        _onRouteMatched: function (oEvent) {
            const oArgs    = oEvent.getParameter("arguments");
            const sDraftId = oArgs.draftId;

            if (sDraftId && sDraftId !== "new") {
                const oPageModel = this.getView().getModel("pageModel");
                oPageModel.setProperty("/mode",         "edit");
                oPageModel.setProperty("/draftId",      sDraftId);
                oPageModel.setProperty("/supplierName", "");
                this._loadDraft2(sDraftId);
                
            } else {
                this.getView().setModel(new JSONModel({
                    "values":{"draftID":"","compCode":"",
                    "docDate":"","postDate":"","refer":"","headText":"","bankID":"","bankAcc":"",
                    "bankGL":"","curr":"","payAmnt":parseFloat(0),"debit":parseFloat(0),"credit":parseFloat(0),"balance":parseFloat(0)
                    },
                    "state":{"draftID":"None","compCode":"",
                    "docDate":"","postDate":"","refer":"","headText":"","bankID":"","bankAcc":"",
                    "bankGL":"","curr":"","payAmnt":"","debit":"","credit":"","balance":""
                    }, "visSave":true,"visUpd":false,"visSub":false,"visAddR":true,"visEditR":true
                }),"glData");
                this.getView().setModel(new JSONModel({"items":[]},"lineItems"));
                this.getView().getModel("pageModel").setData({
                    mode:         "create",
                    draftId:      null,
                    supplierName: ""
                });
                //this._resetPage();
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
                "pgl_draftidInput",
                "pgl_companyCodeInput",
                "pgl_referenceInput",
                "pgl_headerTextInput",
                "pgl_houseBankInput",
                "pgl_houseBankAccountInput",
                "pgl_glAccountInput",
                "pgl_currencyInput",
                "pgl_payAmountInput",
                "pgl_invoiceSumInput",
                "pgl_balanceInput"
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

            const oDocPicker  = this.byId("pgl_documentDatePicker");
            const oPostPicker = this.byId("pgl_postingDatePicker");
            if (oDocPicker)  { oDocPicker.setValue("");  }
            if (oPostPicker) { oPostPicker.setValue(""); }

            this.getView().getModel("pageModel").setProperty("/supplierName", "");
            this._applyDisplayMode("");
            this._updateSaveButton("create");

            // Reset line items
            const oLineModel = this.getView().getModel("lineItems");
            if (oLineModel) { oLineModel.setProperty("/items", []); }

            // Reset selection state
            this._iSelectedLineItemIndex = -1;
            this._sLineItemMode          = "add";
            const oEditButton = this.byId("pglItemsInfoedit");
            const oTable      = this.byId("pglitemtable");
            if (oEditButton) { oEditButton.setEnabled(false); }
            if (oTable)      { oTable.removeSelections(true); }

            // Reset line item totals
            const oDebitInput   = this.byId("pgl_totalDebitInput");
            const oCreditInput  = this.byId("pgl_totalCreditInput");
            const oBalanceInput = this.byId("pgl_lineBalanceInput");
            if (oDebitInput)   { oDebitInput.setValue("");   }
            if (oCreditInput)  { oCreditInput.setValue("");  }
            if (oBalanceInput) {
                oBalanceInput.setValue("");
                oBalanceInput.setValueState(sap.ui.core.ValueState.None);
            }

            const oPageModel = this.getView().getModel("pageModel");
            if (oPageModel) {
                oPageModel.setProperty("/totalDebit",  "");
                oPageModel.setProperty("/totalCredit", "");
                oPageModel.setProperty("/lineBalance", "");
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Save / Update button visibility
        // ─────────────────────────────────────────────────────────────────────
        _updateSaveButton: function (sMode) {
            const sDraftSt = this.getView().getModel("pageModel").getProperty("/draftSt");
            if (sDraftSt === "2" || sDraftSt === "3") { return; }

            const oSaveButton   = this.byId("_IDGenButton25gl");
            const oUpdateButton = this.byId("_IDGenButton27gl");
            if (oSaveButton)   { oSaveButton.setVisible(sMode !== "edit");  }
            if (oUpdateButton) { oUpdateButton.setVisible(sMode === "edit"); }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Load draft (Edit mode)
        // ─────────────────────────────────────────────────────────────────────
        _loadDraft: function (sDraftId) {
            const oDataModel = this.getOwnerComponent().getModel();
            const that       = this;

            this.getView().setBusy(true);

            oDataModel.read("/head('" + sDraftId + "')", {
                urlParameters: { "$expand": "to_item" },
                success: function (oHead) {
                    that.getView().setBusy(false);
                    that._populateFormFields(oHead);

                    // Load approvers for statuses 2–6
                    if (["2","3","4","5","6"].indexOf(oHead.draftSt) !== -1) {
                        const aApFilters = [new Filter("draftID", FilterOperator.EQ, sDraftId)];
                        oDataModel.read("/aprvrs", {
                            filters: aApFilters,
                            success: function (oData) {
                                const oAprvrModel = new JSONModel(oData.results);
                                that.getView().setModel(oAprvrModel, "aprvrTab");
                                const oAprvrTable = that.byId("gl_aprvrTable");
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
        // Load draft (Edit mode)
        // ─────────────────────────────────────────────────────────────────────
        _loadDraft2: function (sDraftId) {
            const oDataModel = this.getOwnerComponent().getModel();
            const that       = this;

            this.getView().setBusy(true);

            oDataModel.read("/head('" + sDraftId + "')", {
                urlParameters: { "$expand": "to_item" },
                
                success: function (oHead) {
                    var lineItems = [];
                    that.getView().setBusy(false);
                    var totCredit = parseFloat(0);
                    var totDebit = parseFloat(0);
                    for(var i=0;i<oHead.to_item.length;i++){
                        var itemData = oHead.to_item[i];
                        if (itemData.debCredInd === 'H')
                            totCredit = totCredit +  parseFloat(itemData.amntDC);
                        else
                            totDebit = totDebit +  parseFloat(itemData.amntDC);
                        
                        lineItems.push({"glAccount": itemData.glAccount,"amount": parseFloat(itemData.amntDC), "costCenter": itemData.costCenter  , 
                                        "profitCenter":  itemData.profitCntr, "wbs":itemData.wbs,"itemText":itemData.itemText,
                                        "taxCode": itemData.taxCode,"dcIndicator": itemData.debCredInd,"taxAmount": parseFloat(itemData.taxAmntDC),
                                        amountWithTax: parseFloat(itemData.taxAmntDC) + parseFloat(itemData.amntDC)});
                    }
                    that.getView().setModel(new JSONModel({
                        "values":{"draftID":oHead.draftID,"compCode":oHead.compCode,
                        "docDate":oHead.docDate,"postDate":oHead.postingDate,"refer":oHead.reference,"headText":oHead.headText,"bankID":oHead.bankKey,
                        "bankAcc":oHead.bankAcc,"bankGL":oHead.bankGL,"curr":oHead.curr,"payAmnt":parseFloat(oHead.payAmnt),
                        "debit":parseFloat(0),"credit":parseFloat(0),"balance":parseFloat(0)
                        },
                        "state":{"draftID":"None","compCode":"",
                        "docDate":"","postDate":"","refer":"","headText":"","bankID":"","bankAcc":"",
                        "bankGL":"","curr":"","payAmnt":"","debit":"","credit":"","balance":""
                        }, "visSave":true,"visUpd":false,"visSub":false,"visAddR":true,"visEditR":true
                    }),"glData");                    
                    
                    this.getView().setModel(new JSONModel({"items":lineItems},"lineItems"));

                    // Load approvers for statuses 2–6
                    if (["2","3","4","5","6"].indexOf(oHead.draftSt) !== -1) {
                        const aApFilters = [new Filter("draftID", FilterOperator.EQ, sDraftId)];
                        oDataModel.read("/aprvrs", {
                            filters: aApFilters,
                            success: function (oData) {
                                const oAprvrModel = new JSONModel(oData.results);
                                that.getView().setModel(oAprvrModel, "aprvrTab");
                                const oAprvrTable = that.byId("gl_aprvrTable");
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

            // Map backend fields → pgl_ fragment input IDs
            fnSet("pgl_draftidInput",         oHead.draftId);
            fnSet("pgl_companyCodeInput",      oHead.compCode);
            fnSet("pgl_referenceInput",        oHead.reference);
            fnSet("pgl_headerTextInput",       oHead.headText);
            fnSet("pgl_houseBankInput",        oHead.bankKey);
            fnSet("pgl_houseBankAccountInput", oHead.bankAcc);
            fnSet("pgl_glAccountInput",        oHead.bankGL);
            fnSet("pgl_currencyInput",         oHead.curr);
            fnSet("pgl_payAmountInput",        oHead.payAmnt);
            fnSetDate("pgl_documentDatePicker",  oHead.docDate);
            fnSetDate("pgl_postingDatePicker",   oHead.postingDate);

            const oPageModel = this.getView().getModel("pageModel");
            oPageModel.setProperty("/postDoc", oHead.postDoc || "");
            oPageModel.setProperty("/msg",     oHead.msg     || "");
            oPageModel.setProperty("/draftSt", oHead.draftSt || "");
            oPageModel.setProperty("/draftId", oHead.draftId || "");
            oPageModel.setProperty("/compCode",    oHead.compCode    || "");
            oPageModel.setProperty("/fiscYear",    oHead.fiscYear    || "");
            oPageModel.setProperty("/reference",   oHead.reference   || "");
            oPageModel.setProperty("/headText",    oHead.headText    || "");
            oPageModel.setProperty("/bankKey",     oHead.bankKey     || "");
            oPageModel.setProperty("/bankAcc",     oHead.bankAcc     || "");
            oPageModel.setProperty("/bankGL",      oHead.bankGL      || "");
            oPageModel.setProperty("/curr",        oHead.curr        || "");
            oPageModel.setProperty("/payAmnt",     oHead.payAmnt     || "");

            // ── Populate line items from to_item expand ───────────────────────
            const aBackendItems = (oHead.to_item && oHead.to_item.results) ? oHead.to_item.results : [];
            const aMappedItems = aBackendItems.map(function (oItem) {
            const bDebit   = oItem.debCredInd === "S";
            const fAmt     = parseFloat(oItem.amntLC    || "0");
            const fTaxAmt  = parseFloat(oItem.taxAmntLC || "0");
            const fWithTax = parseFloat(oItem.refAmntLC || "0") || (fAmt + fTaxAmt);

            const sWbs = (oItem.wbs || "").replace(/^0+$/, "");

            return {
                glAccount:     oItem.glAccount  ,   // correct field
                amount:        oItem.amntLC  ,
                costCenter:    oItem.costCntr   ,
                profitCenter:  oItem.profitCntr   ,
                wbs:           sWbs,
                itemText:      oItem.itemText    ,
                taxCode:       oItem.taxCode      ,
                dcIndicator:   bDebit ? "Debit" : (oItem.debCredInd === "H" ? "Credit" : ""),
                taxAmount:     fTaxAmt.toFixed(3),
                amountWithTax: fWithTax.toFixed(3),
                itemId:        oItem.itemId       
            };
        });
                const oLineModel = this.getView().getModel("lineItems");
                if (oLineModel) { oLineModel.setProperty("/items", aMappedItems); }

                // Recalculate totals from loaded items
                this._calcLineItemTotals();

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

            const oEditFormBox    = this.byId("gl_editFormBox");
            const oDisplayFormBox = this.byId("gl_displayFormBox");
            if (oEditFormBox)    { oEditFormBox.setVisible(!bDisplayForm);  }
            if (oDisplayFormBox) { oDisplayFormBox.setVisible(bDisplayForm); }

            // Populate display fragment pageModel date properties
            if (bDisplayForm) {
                const oPageModel = this.getView().getModel("pageModel");
                const fnGetDate  = function (sId) {
                    const oCtrl = this.byId(sId);
                    if (!oCtrl) { return ""; }
                    const oDate = oCtrl.getDateValue();
                    if (!oDate) { return ""; }
                    return String(oDate.getDate()).padStart(2, "0") + "/" +
                           String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
                           oDate.getFullYear();
                }.bind(this);
                oPageModel.setProperty("/docDate",     fnGetDate("pgl_documentDatePicker"));
                oPageModel.setProperty("/postingDate", fnGetDate("pgl_postingDatePicker"));
            }

            // Fields always locked in Created/Rejected
            const aAlwaysLockedIds = [
                "pgl_companyCodeInput",
                "pgl_houseBankInput",
                "pgl_houseBankAccountInput",
                "pgl_glAccountInput"
            ];

            // Fields editable in Created / Rejected modes
            const aEditableIds = [
                "pgl_referenceInput", "pgl_headerTextInput",
                "pgl_currencyInput",  "pgl_payAmountInput",
                "pgl_documentDatePicker", "pgl_postingDatePicker"
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

            // Buttons
            const oSaveButton     = this.byId("_IDGenButton25gl");
            const oUpdateButton   = this.byId("_IDGenButton27gl");
            const oSubmitButton   = this.byId("_IDGenButton26gl");
            const oPostButton     = this.byId("_IDGenButton2622gl");
            const oResubmitButton = this.byId("resubmitButtongl");
            const oAprvrTable     = this.byId("gl_aprvrTable");

            if (bIsInApproval) {
                if (oSaveButton)     { oSaveButton.setVisible(false);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);   }
                if (oPostButton)     { oPostButton.setVisible(false);     }
                if (oResubmitButton) { oResubmitButton.setVisible(false); }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);      }
                this._setPostingInfoVisible(false, false);

            } else if (bIsApproved) {
                if (oSaveButton)     { oSaveButton.setVisible(false);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);   }
                if (oPostButton)     { oPostButton.setVisible(true);      }
                if (oResubmitButton) { oResubmitButton.setVisible(false); }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);      }
                this._setPostingInfoVisible(false, false);

            } else if (bIsCreated) {
                if (oSaveButton)     { oSaveButton.setVisible(false);                            }
                if (oUpdateButton)   { oUpdateButton.setVisible(true);                           }
                if (oSubmitButton)   { oSubmitButton.setVisible(true); oSubmitButton.setText("Submit"); }
                if (oPostButton)     { oPostButton.setVisible(false);                            }
                if (oResubmitButton) { oResubmitButton.setVisible(false);                        }
                if (oAprvrTable)     { oAprvrTable.setVisible(false);                            }

            } else if (bIsRejected) {
                if (oSaveButton)     { oSaveButton.setVisible(false);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);   }
                if (oPostButton)     { oPostButton.setVisible(false);     }
                if (oResubmitButton) { oResubmitButton.setVisible(true);  }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);      }

            } else if (bIsPostErr) {
                if (oSaveButton)     { oSaveButton.setVisible(false);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);   }
                if (oPostButton)     { oPostButton.setVisible(true);      }
                if (oResubmitButton) { oResubmitButton.setVisible(false); }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);      }
                this._setPostingInfoVisible(false, true);

            } else if (bIsPosted) {
                if (oSaveButton)     { oSaveButton.setVisible(false);     }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(false);   }
                if (oPostButton)     { oPostButton.setVisible(false);     }
                if (oResubmitButton) { oResubmitButton.setVisible(false); }
                if (oAprvrTable)     { oAprvrTable.setVisible(true);      }
                this._setPostingInfoVisible(true, false);

            } else {
                // Create mode
                if (oSaveButton)     { oSaveButton.setVisible(true);      }
                if (oUpdateButton)   { oUpdateButton.setVisible(false);   }
                if (oSubmitButton)   { oSubmitButton.setVisible(true);    }
                if (oPostButton)     { oPostButton.setVisible(false);     }
                if (oResubmitButton) { oResubmitButton.setVisible(false); }
                if (oAprvrTable)     { oAprvrTable.setVisible(false);     }
            }
        },

        _setPostingInfoVisible: function (bShowDoc, bShowMsg) {
            const oPostDocLabel = this.byId("pgl_postdoclabel");
            const oPostDocText  = this.byId("pgl_postdocText");
            const oPostMsgLabel = this.byId("pgl_postmsglabel");
            const oPostMsgText  = this.byId("pgl_postmsgText");
            if (oPostDocLabel) { oPostDocLabel.setVisible(bShowDoc); }
            if (oPostDocText)  { oPostDocText.setVisible(bShowDoc);  }
            if (oPostMsgLabel) { oPostMsgLabel.setVisible(bShowMsg); }
            if (oPostMsgText)  { oPostMsgText.setVisible(bShowMsg);  }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Collect form values
        // ─────────────────────────────────────────────────────────────────────
        _collectFormValues: function () {
            const fnVal = function (sId) {
                const oCtrl = this.byId(sId);
                return oCtrl ? oCtrl.getValue().trim() : "";
            }.bind(this);

            return {
                sCompCode:  fnVal("pgl_companyCodeInput"),
                sReference: fnVal("pgl_referenceInput"),
                sHeadText:  fnVal("pgl_headerTextInput"),
                sBankKey:   fnVal("pgl_houseBankInput"),
                sBankAcc:   fnVal("pgl_houseBankAccountInput"),
                sBankGL:    fnVal("pgl_glAccountInput"),
                sCurrency:  fnVal("pgl_currencyInput"),
                sPayAmnt:   fnVal("pgl_payAmountInput"),
                oDocDate:   this.byId("pgl_documentDatePicker")
                                ? this.byId("pgl_documentDatePicker").getDateValue() : null,
                oPostDate:  this.byId("pgl_postingDatePicker")
                                ? this.byId("pgl_postingDatePicker").getDateValue()  : null
            };
        },

        _validateForm: function (oVals) {
            if (!oVals.sCompCode || !oVals.sBankKey  ||
                !oVals.sBankAcc  || !oVals.sBankGL   ||
                !oVals.oDocDate  || !oVals.oPostDate) {
                MessageBox.error("Please fill all required fields before saving.");
                return false;
            }
            return true;
        },

        // ─────────────────────────────────────────────────────────────────────
        // Build to_item from lineItems JSON model
        // Maps each dialog row → OData item structure
        // ─────────────────────────────────────────────────────────────────────
            _buildToItems: function (sCompCode, sCurr) {
                const oLineModel = this.getView().getModel("lineItems");
                const aItems     = oLineModel ? (oLineModel.getProperty("/items") || []) : [];

                if (aItems.length === 0) {
                    return [{
                        itemId:   "001",
                        itemTy:   "1",
                        amntLC:   "0.000",
                        compCode: sCompCode,
                        compCurr: sCurr,
                        docCurr:  sCurr
                    }];
                }

                return aItems.map(function (oRow, iIndex) {
                    const sItemId     = String(iIndex + 1).padStart(3, "0");
                    const bDebit      = oRow.dcIndicator === "Debit";
                    const sDebCredInd = bDebit ? "S" : "H";
                    const sAmnt       = parseFloat(oRow.amount        || "0").toFixed(3);
                    const sTaxAmnt    = parseFloat(oRow.taxAmount     || "0").toFixed(3);
                    const sRefAmnt    = parseFloat(oRow.amountWithTax || "0").toFixed(3);

                    return {
                    itemId:     sItemId,
                    itemTy:     "1",
                    amntLC:     sAmnt,
                    amntDC:     sAmnt,
                    taxAmntLC:  sTaxAmnt,
                    taxAmntDC:  sTaxAmnt,
                    refAmntLC:  sRefAmnt,
                    refAmntDC:  sRefAmnt,
                    compCode:   sCompCode,
                    compCurr:   sCurr,
                    docCurr:    sCurr,
                    debCredInd: sDebCredInd,
                    costCntr:   oRow.costCenter  || "",
                    profitCntr: oRow.profitCenter|| "",
                    wbs:        oRow.wbs         || "",
                    itemText:   oRow.itemText    || "",
                    taxCode:    (oRow.taxCode    || "").trim().substring(0, 2),
                    glAccount:  oRow.glAccount   || ""   // correct field
                };
                });
            },

        // ─────────────────────────────────────────────────────────────────────
        // OData date helpers
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

        _toODataDate2: function (value) {
            if (!value) { return null; }
            const date1   = value.toDateString();
            const time1   = new Date().toTimeString();
            const timest1 = date1 + " " + time1;
            return new Date(timest1);
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
        // Pay Amount change
        // ─────────────────────────────────────────────────────────────────────
        onPayAmountChange: function (oEvent) {
            // this.getView().getModel("glData")
            // const oPayInput     = this.byId("pgl_payAmountInput");
            // const oInvSumInput  = this.byId("pgl_invoiceSumInput");
            // const oBalanceInput = this.byId("pgl_balanceInput");

            // const fPayAmnt    = parseFloat(oPayInput    ? oPayInput.getValue()    : "0") || 0;
            // const fInvoiceSum = parseFloat(oInvSumInput ? oInvSumInput.getValue() : "0") || 0;
            // const fBalance    = fPayAmnt - fInvoiceSum;

            // if (oBalanceInput) {
            //     oBalanceInput.setValue(fBalance.toFixed(3));
            //     oBalanceInput.setValueState(
            //         Math.abs(fBalance) < 0.001
            //             ? sap.ui.core.ValueState.None
            //             : sap.ui.core.ValueState.Warning
            //     );
            // }
        },
        ///Revamp-01        
        calcBalance(oEvent){
            var glData = this.getView().getModel("glData").getData();
            glData.values.balance = parseFloat(glData.values.payAmnt) + parseFloat(glData.values.credit) - parseFloat(glData.values.debit);
            this.getView().getModel("glData").setDate(glData);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Save (Create — action "I", draftType hardcoded "4")
        // ─────────────────────────────────────────────────────────────────────
        onSave: function () {
            var glData = this.getView().getModel("glData").getData();

            const oPayload = {
                compCode:    glData.compCode,
                draftType:   "4",                                          // hardcoded
                docDate:     this._toODataDate2(glData.docDate),
                postingDate: this._toODataDate2(glData.postDate),
                reference:   glData.refer,
                headText:    glData.headText,
                bankKey:     glData.bankID,
                bankAcc:     glData.bankAcc,
                bankGL:      glData.bankGL,
                curr:        glData.curr,
                payAmnt:     parseFloat(glData.payAmnt || "0").toFixed(3),
                action:      "I"   ,
                to_items: []             
            };
            var lineItems = this.getView().getModel("itemData");
            for (var i=0;i<lineItems.length;i++){
                var item1 = lineItems[i];
                
                oPayload.to_items.push({ "itemId": (parseInt(i) + 1), "itemTy":"1", "amntLC":item1.amount, "amntDC":item1.amount,
                    "taxAmntLC": item1.taxAmount,"taxAmntDC": item1.taxAmount,"compCode":glData.compCode,//"compCurr": ,
                    "docCurr": item1.curr,"debCredInd": item1.dcIndicator,"costCntr": item1.costCenter,"profitCntr":item1.profitCenter,
                    "wbs":item1.wbs,"itemText":item1.itemText, "taxCode":   item1.taxCode, "glAccount":item1.glAccount   
                });             
            }
            
            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);
            var that = this;
            oDataModel.create("/head", oPayload, {
                success: function (oCreatedData) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);

                    glData.visUpd = true;
                    glData.visSave = false;
                    glData.draftID = oCreatedData.draftId;
                    
                    that.getView().getModel("glData").setData(glData);
                    var pageData = that.getView().getModel("pageModel").getData();
                    pageData.mode = "edit";
                    pageData.draftID = glData.draftID;
                    that.getView().getModel("pageModel").setData(pageData);
                    
                    MessageToast.show("Saved successfully. Draft ID: " + sDraftId);
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    that._showError(oError, "Failed to save.");
                }
            });

//             const that  = this;
//             const oVals = this._collectFormValues();
//             if (!this._validateForm(oVals)) { return; }
//             // ── Balance check — must be zero ─────────────────────────────────────
//             const fLineBalance = this._calcLineItemTotals();
//             if (Math.abs(fLineBalance) >= 0.001) {
//                 MessageBox.error(
//                     "Document cannot be saved. Balance must be zero.\n" +
//                     "Current Balance: " + fLineBalance.toFixed(3)
//                 );
//                 return;
// }

//             const oPayload = {
//                 compCode:    oVals.sCompCode,
//                 draftType:   "4",                                          // hardcoded
//                 docDate:     this._toODataDate2(oVals.oDocDate),
//                 postingDate: this._toODataDate2(oVals.oPostDate),
//                 reference:   oVals.sReference,
//                 headText:    oVals.sHeadText,
//                 bankKey:     oVals.sBankKey,
//                 bankAcc:     oVals.sBankAcc,
//                 bankGL:      oVals.sBankGL,
//                 curr:        oVals.sCurrency,
//                 payAmnt:     parseFloat(oVals.sPayAmnt || "0").toFixed(3),
//                 action:      "I",
//                 to_item:     this._buildToItems(oVals.sCompCode, oVals.sCurrency)
//             };

//             const oDataModel = this.getOwnerComponent().getModel();
//             oDataModel.setUseBatch(false);
//             this._setBusyDialog(true);

//             oDataModel.create("/head", oPayload, {
//                 success: function (oCreatedData) {
//                     that._setBusyDialog(false);
//                     oDataModel.setUseBatch(true);

//                     const sDraftId = oCreatedData.draftId;
//                     const oDraftIdInput = that.byId("pgl_draftidInput");
//                     if (oDraftIdInput && sDraftId) { oDraftIdInput.setValue(sDraftId); }

//                     const oPageModel = that.getView().getModel("pageModel");
//                     oPageModel.setProperty("/mode",    "edit");
//                     oPageModel.setProperty("/draftId", sDraftId);

//                     that._updateSaveButton("edit");
//                     MessageToast.show("Saved successfully. Draft ID: " + sDraftId);
//                 },
//                 error: function (oError) {
//                     that._setBusyDialog(false);
//                     oDataModel.setUseBatch(true);
//                     that._showError(oError, "Failed to save.");
//                 }
//             });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Update (action "U", draftType hardcoded "4")
        // ─────────────────────────────────────────────────────────────────────
        onUpdate: function () {
            const that          = this;
            const oPageModel    = this.getView().getModel("pageModel");
            const sSavedDraftId = oPageModel.getProperty("/draftId");
            const oVals         = this._collectFormValues();
            if (!this._validateForm(oVals)) { return; }
            // ── Balance check — must be zero ─────────────────────────────────────
            const fLineBalance = this._calcLineItemTotals();
            if (Math.abs(fLineBalance) >= 0.001) {
                MessageBox.error(
                    "Document cannot be saved. Balance must be zero.\n" +
                    "Current Balance: " + fLineBalance.toFixed(3)
                );
                return;
            }

            const oPayload = {
                draftId:     sSavedDraftId,
                compCode:    oVals.sCompCode,
                draftType:   "4",                                          // hardcoded
                docDate:     this._toODataDate2(oVals.oDocDate),
                postingDate: this._toODataDate2(oVals.oPostDate),
                reference:   oVals.sReference,
                headText:    oVals.sHeadText,
                bankKey:     oVals.sBankKey,
                bankAcc:     oVals.sBankAcc,
                bankGL:      oVals.sBankGL,
                curr:        oVals.sCurrency,
                payAmnt:     parseFloat(oVals.sPayAmnt || "0").toFixed(3),
                action:      "U",
                to_item:     this._buildToItems(oVals.sCompCode, oVals.sCurrency)
            };
            debugger;
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
                    that._showError(oError, "Failed to update.");
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
                debugger;
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
                        that._showError(oError, "Failed to submit payment.");
                    }
                });
            };

            if (sMode === "edit") {
                // Update first, then submit after success
                const oVals = this._collectFormValues();
                if (!this._validateForm(oVals)) { return; }

                const oPayload = {
                    draftId:     sSavedDraftId,
                    compCode:    oVals.sCompCode,
                    draftType:   "4",
                    docDate:     this._toODataDate2(oVals.oDocDate),
                    postingDate: this._toODataDate2(oVals.oPostDate),
                    reference:   oVals.sReference,
                    headText:    oVals.sHeadText,
                    bankKey:     oVals.sBankKey,
                    bankAcc:     oVals.sBankAcc,
                    bankGL:      oVals.sBankGL,
                    curr:        oVals.sCurrency,
                    payAmnt:     parseFloat(oVals.sPayAmnt || "0").toFixed(3),
                    action:      "U",
                    to_item:     this._buildToItems(oVals.sCompCode, oVals.sCurrency)
                };

                

                const oDataModel2 = this.getOwnerComponent().getModel();
                oDataModel2.setUseBatch(false);
                this._setBusyDialog(true);
                // In onSubmit, edit mode branch — add before oDataModel2.create
                const fLineBalance = this._calcLineItemTotals();
                if (Math.abs(fLineBalance) >= 0.001) {
                    MessageBox.error(
                        "Document cannot be submitted. Balance must be zero.\n" +
                        "Current Balance: " + fLineBalance.toFixed(3)
                    );
                    return;
                }
                oDataModel2.create("/head", oPayload, {
                    success: function () {
                        oDataModel2.setUseBatch(true);
                        fnSubmit(sSavedDraftId);    // submit after update succeeds
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel2.setUseBatch(true);
                        that._showError(oError, "Failed to update before submit.");
                    }
                });

            } else {
                // Create mode: save first, then submit once draftId is available
                const oVals = this._collectFormValues();
                if (!this._validateForm(oVals)) { return; }

                const oPayload = {
                    compCode:    oVals.sCompCode,
                    draftType:   "4",
                    docDate:     this._toODataDate2(oVals.oDocDate),
                    postingDate: this._toODataDate2(oVals.oPostDate),
                    reference:   oVals.sReference,
                    headText:    oVals.sHeadText,
                    bankKey:     oVals.sBankKey,
                    bankAcc:     oVals.sBankAcc,
                    bankGL:      oVals.sBankGL,
                    curr:        oVals.sCurrency,
                    payAmnt:     parseFloat(oVals.sPayAmnt || "0").toFixed(3),
                    action:      "I",
                    to_item:     this._buildToItems(oVals.sCompCode, oVals.sCurrency)
                };

                const oDataModel3 = this.getOwnerComponent().getModel();
                oDataModel3.setUseBatch(false);
                this._setBusyDialog(true);
                oDataModel3.create("/head", oPayload, {
                    success: function (oCreatedData) {
                        oDataModel3.setUseBatch(true);
                        const sDraftId      = oCreatedData.draftId;
                        const oDraftIdInput = that.byId("pgl_draftidInput");
                        if (oDraftIdInput && sDraftId) { oDraftIdInput.setValue(sDraftId); }
                        that.getView().getModel("pageModel").setProperty("/draftId", sDraftId);
                        fnSubmit(sDraftId);         // submit immediately after save
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel3.setUseBatch(true);
                        that._showError(oError, "Failed to save before submit.");
                    }
                });
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
                                    "Document " + oData.postDoc + " posted successfully for Draft ID: " + sDraftId,
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
                            that._showError(oError, "Failed to post payment.");
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
            const sSavedDraftId = oPageModel.getProperty("/draftId");
            const oDataModel    = this.getOwnerComponent().getModel();

            oDataModel.setUseBatch(false);
            that._setBusyDialog(true);
            oDataModel.create("/head", { draftId: sSavedDraftId, action: "R" }, {
                success: function () {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    MessageBox.success("Payment resubmitted successfully. Draft ID: " + sSavedDraftId, {
                        onClose: function () {
                            that.getOwnerComponent().getRouter().navTo("RouteNewDoc");
                        }
                    });
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    that._showError(oError, "Failed to resubmit payment.");
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Line Items model
        // ─────────────────────────────────────────────────────────────────────
        _initLineItemsModel: function () {
            const oModel = new JSONModel({ items: [] });
            this.getView().setModel(oModel, "lineItems");
        },

        // ─────────────────────────────────────────────────────────────────────
        // Open line item dialog — Add mode
        // ─────────────────────────────────────────────────────────────────────
        onOpenLineItemDialog: function () {

            this.getView().setModel(new JSONModel({
                glAccount:     "",amount:   parseFloat(0), costCenter:  "", profitCenter:  "",
                wbs:"",itemText:"",taxCode: "",dcIndicator: "",taxAmount: parseFloat(0),
                amountWithTax: parseFloat(0)
            }),"itemData");    


            this._sLineItemMode = "add";
            const that = this;

            if (!this._oPGLLineItemDialog) {
                sap.ui.core.Fragment.load({
                    id:         this.getView().getId(),
                    name:       "zfi.payment.management.fragments.PGLFrag.PGLLineItems",
                    controller: this
                }).then(function (oDialog) {
                    that._oPGLLineItemDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    that._clearLineItemDialog();
                    oDialog.setTitle("Add Line Item");
                    
                    oDialog.open();
                });
            } else {
                this._clearLineItemDialog();
                this._oPGLLineItemDialog.setTitle("Add Line Item");
                this._oPGLLineItemDialog.open();
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Open dialog — Edit mode, pre-fill fields
        // ─────────────────────────────────────────────────────────────────────
        onEditLineItem: function () {
            const iIndex = this._iSelectedLineItemIndex;
            if (iIndex === undefined || iIndex < 0) {
                MessageBox.error("Please select a line item to edit.");
                return;
            }

            const oLineModel = this.getView().getModel("lineItems");
            const aItems     = oLineModel.getProperty("/items") || [];
            const oRow       = aItems[iIndex];
            if (!oRow) { return; }

            this._sLineItemMode = "edit";
            // this.getView().setModel(new JSONModel({
            //                 glAccount: oRow.glAccount,amount: parseFloat(oRow.amount), costCenter: oRow.costCenter, 
            //                 profitCenter:  oRow.profitCenter,
            //                 wbs:oRow.wbs,itemText:oRow.itemText,taxCode: oRow.taxCode,
            //                 dcIndicator: oRow.dcIndicator,taxAmount: oRow.taxAmount,
            //                 amountWithTax: parseFloat(0)
            //             }),"itemData");
            this.getView().setModel(new JSONModel(oRow),"itemData");                
            const that = this;

            const fnFill = function () {
                const oView = that.getView();
                const fnSet = function (sId, sVal) {
                    const oCtrl = oView.byId(sId);
                    if (oCtrl) { oCtrl.setValue(sVal || ""); }
                };

                fnSet("pglDlg_glAccount",    oRow.glAccount);
                fnSet("pglDlg_amount",       oRow.amount);
                fnSet("pglDlg_costCenter",   oRow.costCenter);
                fnSet("pglDlg_profitCenter", oRow.profitCenter);
                fnSet("pglDlg_wbs",          oRow.wbs);
                fnSet("pglDlg_itemText",     oRow.itemText);
                fnSet("pglDlg_taxCode",      oRow.taxCode);
                fnSet("pglDlg_amtWithTax",   oRow.amountWithTax);

                // Restore calc cache
                that._fCurrentTaxAmount  = parseFloat(oRow.taxAmount)     || 0;
                that._fCurrentAmtWithTax = parseFloat(oRow.amountWithTax) || 0;

                const sKey   = oRow.dcIndicator === "Debit" ? "D" : "C";
                const oCombo = oView.byId("pglDlg_dcCombo");
                if (oCombo) { oCombo.setSelectedKey(sKey); }

                oView.byId("pglDlg_amtWithTaxLabel")?.setVisible(true);
                oView.byId("pglDlg_amtWithTax")     ?.setVisible(true);

                that._oPGLLineItemDialog.setTitle("Edit Line Item");
                that._oPGLLineItemDialog.open();
};
            

            if (!this._oPGLLineItemDialog) {
                sap.ui.core.Fragment.load({
                    id:         this.getView().getId(),
                    name:       "zfi.payment.management.fragments.PGLFrag.PGLLineItems",
                    controller: this
                }).then(function (oDialog) {
                    that._oPGLLineItemDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    fnFill();
                });
            } else {
                fnFill();
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // ComboBox change — toggle Debit/Credit inputs in dialog
        // ─────────────────────────────────────────────────────────────────────
        onDCChange: function (oEvent) {
            const sKey   = oEvent.getSource().getSelectedKey();
            const bShow  = sKey === "D" || sKey === "C";
            const oView  = this.getView();

            oView.byId("pglDlg_amtWithTaxLabel")?.setVisible(bShow);
            oView.byId("pglDlg_amtWithTax")     ?.setVisible(bShow);

            // Recalculate when DC changes
            if (bShow) { this._calcAmountWithTax(); }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Add / Update row in JSON model
        // ─────────────────────────────────────────────────────────────────────
        onAddLineItem: function () {
            var glData = this.getView().getModel("glData").getData();
            var itemData = this.getView().getModel("itemData").getData();
            var lineItems = this.getView().getModel("lineItems").getData();
            if ( itemData.amountWithTax === "")
                itemData.amountWithTax = itemData.amount;

            lineItems.items.push(itemData);
            if( itemData.dcIndicator === 'H')
                glData.values.credit = parseFloat(glData.values.credit) + parseFloat(itemData.amountWithTax );
            else
                glData.values.debit = parseFloat(glData.values.debit) + parseFloat(itemData.amountWithTax );
            glData.values.balance = parseFloat(glData.values.credit) + parseFloat(glData.values.payAmnt) - 
                                            parseFloat(glData.values.debit);

            
            this.getView().getModel("glData").setData(glData);
            this.getView().getModel("itemData").setData(itemData);
            this.getView().getModel("lineItems").setData(lineItems);

            if (this._oPGLLineItemDialog) {
                this._oPGLLineItemDialog.close();
            }

            // const oView = this.getView();
            // const fnVal = function (sId) {
            //     const oCtrl = oView.byId(sId);
            //     return oCtrl ? oCtrl.getValue().trim() : "";
            // };

            // const oCombo  = oView.byId("pglDlg_dcCombo");
            // const sKey    = oCombo ? oCombo.getSelectedKey() : "";
            // const sKeyTxt = sKey === "D" ? "Debit" : sKey === "C" ? "Credit" : "";

            // if (!sKey) {
            //     MessageBox.error("Please select Debit or Credit.");
            //     return;
            // }

            // const fAmt      = parseFloat(fnVal("pglDlg_amount"))   || 0;
            // const fTaxAmt   = this._fCurrentTaxAmount   || 0;
            // const fWithTax  = this._fCurrentAmtWithTax  || fAmt;

            // const oRow = {
            //     glAccount:     fnVal("pglDlg_glAccount"),
            //     amount:        fAmt.toFixed(3),
            //     costCenter:    fnVal("pglDlg_costCenter"),
            //     profitCenter:  fnVal("pglDlg_profitCenter"),
            //     wbs:           fnVal("pglDlg_wbs"),
            //     itemText:      fnVal("pglDlg_itemText"),
            //     taxCode:       fnVal("pglDlg_taxCode"),
            //     dcIndicator:   sKeyTxt,
            //     taxAmount:     fTaxAmt.toFixed(3),
            //     amountWithTax: fWithTax.toFixed(3)
            // };

            // const oLineModel = this.getView().getModel("lineItems");
            // const aItems     = oLineModel.getProperty("/items") || [];

            // if (this._sLineItemMode === "edit" && this._iSelectedLineItemIndex >= 0) {
            //     aItems[this._iSelectedLineItemIndex] = oRow;
            //     oLineModel.setProperty("/items", aItems);

            //     const oTable      = this.byId("pglitemtable");
            //     const oEditButton = this.byId("pglItemsInfoedit");
            //     if (oTable)      { oTable.removeSelections(true); }
            //     if (oEditButton) { oEditButton.setEnabled(false); }
            //     this._iSelectedLineItemIndex = -1;
            // } else {
            //     aItems.push(oRow);
            //     oLineModel.setProperty("/items", aItems);
            // }

            // // Recalculate totals after every add/edit
            // this._calcLineItemTotals();

            // // Reset calc cache
            // this._fCurrentTaxAmount  = 0;
            // this._fCurrentAmtWithTax = 0;

            // if (this._oPGLLineItemDialog) {
            //     this._oPGLLineItemDialog.close();
            // }
        },
        ///Revamp-01
        addNewItem(oEvent){

        }   ,     
        // ─────────────────────────────────────────────────────────────────────
        // Cancel dialog
        // ─────────────────────────────────────────────────────────────────────
        onCancelLineItem: function () {
            if (this._oPGLLineItemDialog) {
                this._oPGLLineItemDialog.close();
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Clear dialog fields before opening
        // ─────────────────────────────────────────────────────────────────────
        _clearLineItemDialog: function () {
            const oView = this.getView();

            ["pglDlg_glAccount","pglDlg_amount","pglDlg_costCenter",
            "pglDlg_profitCenter","pglDlg_wbs","pglDlg_itemText",
            "pglDlg_taxCode","pglDlg_amtWithTax"]
                .forEach(function (sId) {
                    const oCtrl = oView.byId(sId);
                    if (oCtrl) { oCtrl.setValue(""); }
                });

            const oCombo = oView.byId("pglDlg_dcCombo");
            if (oCombo) { oCombo.setSelectedKey(""); }

            oView.byId("pglDlg_amtWithTaxLabel")?.setVisible(false);
            oView.byId("pglDlg_amtWithTax")     ?.setVisible(false);

            this._fCurrentTaxAmount  = 0;
            this._fCurrentAmtWithTax = 0;
        },

        // ─────────────────────────────────────────────────────────────────────
        // Row selection — enable/disable Edit button
        // ─────────────────────────────────────────────────────────────────────
        onLineItemSelectionChange: function () {
            const oTable      = this.byId("pglitemtable");
            const oEditButton = this.byId("pglItemsInfoedit");
            const aSelected   = oTable.getSelectedItems();

            if (aSelected.length > 0) {
                this._iSelectedLineItemIndex = oTable.getItems().indexOf(aSelected[0]);
                if (oEditButton) { oEditButton.setEnabled(true); }
            } else {
                this._iSelectedLineItemIndex = -1;
                if (oEditButton) { oEditButton.setEnabled(false); }
            }
        },
        onDlgAmountChange: function () {
            this._calcAmountWithTax();
        },

        onDlgTaxCodeChange: function () {
            this._calcAmountWithTax();
        },

        // ─────────────────────────────────────────────────────────────────────
        // Calculate tax amount and amount with tax from taxCodes model
        // ─────────────────────────────────────────────────────────────────────
        _calcAmountWithTax: function () {
            const oView      = this.getView();
            const oAmtInput  = oView.byId("pglDlg_amount");
            const oTaxInput  = oView.byId("pglDlg_taxCode");
            const oAmtWTax   = oView.byId("pglDlg_amtWithTax");
            const oCombo     = oView.byId("pglDlg_dcCombo");

            if (!oAmtInput || !oTaxInput || !oAmtWTax || !oCombo) { return; }
            if (!oCombo.getSelectedKey()) { return; }

            const fAmount   = parseFloat(oAmtInput.getValue()) || 0;
            const sTaxCode  = oTaxInput.getValue().trim();

            // Look up tax rate from taxCodes JSON model
            const oTaxModel = oView.getModel("taxCodes");
            let   fTaxRate  = 0;

            if (oTaxModel && sTaxCode) {
                const aItems = oTaxModel.getProperty("/items") || [];
                const oFound = aItems.find(function (o) { return o.TaxCode === sTaxCode; });
                if (oFound) {
                    fTaxRate = parseFloat(oFound.TaxRate) || 0;
                }
            }

            const fTaxAmt   = (fAmount * fTaxRate) / 100;
            const fWithTax  = fAmount + fTaxAmt;

            // Store on dialog for use in onAddLineItem
            this._fCurrentTaxAmount   = fTaxAmt;
            this._fCurrentAmtWithTax  = fWithTax;

            oAmtWTax.setValue(fWithTax.toFixed(3));
        },
        // ─────────────────────────────────────────────────────────────────────
        // Calculate Debit/Credit totals and Balance from line items
        // H = Credit (positive), S = Debit (negative)
        // ─────────────────────────────────────────────────────────────────────
        _calcLineItemTotals: function () {
            const oLineModel = this.getView().getModel("lineItems");
            const aItems     = oLineModel ? (oLineModel.getProperty("/items") || []) : [];

            let fTotalDebit  = 0;
            let fTotalCredit = 0;

            aItems.forEach(function (oRow) {
                const fAmtWithTax = parseFloat(oRow.amountWithTax || "0") || 0;
                if (oRow.dcIndicator === "Debit") {
                    // S = Debit → negative
                    fTotalDebit += fAmtWithTax;
                } else if (oRow.dcIndicator === "Credit") {
                    // H = Credit → positive
                    fTotalCredit += fAmtWithTax;
                }
            });

            // Balance = Credit - Debit (should be zero to allow save)
            const fBalance = fTotalCredit - fTotalDebit;

            // Update edit form inputs
            const oDebitInput   = this.byId("pgl_totalDebitInput");
            const oCreditInput  = this.byId("pgl_totalCreditInput");
            const oBalanceInput = this.byId("pgl_lineBalanceInput");

            if (oDebitInput)   { oDebitInput.setValue((-fTotalDebit).toFixed(3));  }
            if (oCreditInput)  { oCreditInput.setValue(fTotalCredit.toFixed(3));   }
            if (oBalanceInput) {
                oBalanceInput.setValue(fBalance.toFixed(3));
                oBalanceInput.setValueState(
                    Math.abs(fBalance) < 0.001
                        ? sap.ui.core.ValueState.None
                        : sap.ui.core.ValueState.Error
                );
            }

            // Update pageModel for display fragment
            const oPageModel = this.getView().getModel("pageModel");
            if (oPageModel) {
                oPageModel.setProperty("/totalDebit",  (-fTotalDebit).toFixed(3));
                oPageModel.setProperty("/totalCredit", fTotalCredit.toFixed(3));
                oPageModel.setProperty("/lineBalance", fBalance.toFixed(3));
            }

            // Return balance for validation use
            return fBalance;
        },

    });
});