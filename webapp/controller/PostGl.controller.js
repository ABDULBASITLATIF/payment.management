sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat", 
    "../modules/InputHelpsPGL",
    "../modules/FieldValidations"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, DateFormat, InputHelpsPGL,FieldValidations) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.PostGL", {
        InputHelpsPGL: InputHelpsPGL,
        FieldValidations: FieldValidations,

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
            this._loadTaxCodesModel();
            this._iSelectedLineItemIndex = -1;
            this._sLineItemMode          = "add";

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RoutePostGl").attachMatched(this._onRouteMatched, this);
        },
        _loadTaxCodesModel: function () {
            const oView      = this.getView();
            const oMainModel = this.getOwnerComponent().getModel();

            oMainModel.read("/taxCodeVH", {
                success: function (oData) {
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

                    oView.setModel(new JSONModel({ items: aUnique }), "taxCodes");
                },
                error: function () {
                    console.error("Failed to preload tax codes.");
                }
            });
        },        

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
                // Reset glData — only Save + Submit visible, no Update
                this.getView().setModel(new JSONModel({
                    "values": {
                        "draftID":  "", "compCode": "",
                        "docDate":  "", "postDate": "", "refer": "", "headText": "",
                        "bankID":   "", "bankAcc":  "", "bankGL": "", "curr": "",
                        "payAmnt":  parseFloat(0), "debit": parseFloat(0),
                        "credit":   parseFloat(0), "balance": parseFloat(0)
                    },
                    "edit":{
                       "compCode":true, "bankID":true,"bankAcc":true,"bankGL":true 
                    } ,
                    "state":{"draftID":"None","compCode":"None",
                    "docDate":"None","postDate":"None","refer":"None","headText":"None","bankID":"None","bankAcc":"None",
                    "bankGL":"None","curr":"None","payAmnt":"None","debit":"None","credit":"None","balance":"None"
                    }, "visSave":true,"visUpd":false,"visSub":true,"visAddR":true,"visEditR":true,"visReSub":false,"visPost":false,
                    "itemSel":"SingleSelectMaster"
                }),"glData");
                // this.getView().setModel(new JSONModel({"items":[]},"lineItems"));
                this.getView().setModel(new JSONModel({"items":[]}), "lineItems");
                this.getView().getModel("pageModel").setData({
                    mode:         "create",
                    draftId:      null,
                    supplierName: ""
                });

                this._iSelectedLineItemIndex = -1;
                this._sLineItemMode          = "add";

                const oTable      = this.byId("pglitemtable");
                const oEditButton = this.byId("pglItemsInfoedit");
                if (oTable)      { oTable.removeSelections(true); }
                if (oEditButton) { oEditButton.setEnabled(false); }

                // Show edit form, hide display form
                const oEditFormBox    = this.byId("gl_editFormBox");
                const oDisplayFormBox = this.byId("gl_displayFormBox");
                if (oEditFormBox)    { oEditFormBox.setVisible(true);   }
                if (oDisplayFormBox) { oDisplayFormBox.setVisible(false); }

                // Hide Post, Resubmit, Approver table
                const oPostButton     = this.byId("_IDGenButton2622gl");
                const oResubmitButton = this.byId("resubmitButtongl");
                const oAprvrTable     = this.byId("gl_aprvrTable");
                if (oPostButton)     { oPostButton.setVisible(false);     }
                if (oResubmitButton) { oResubmitButton.setVisible(false); }
                if (oAprvrTable)     { oAprvrTable.setVisible(false);     }

                // All fields editable in create mode
                const aAllFields = [
                    "pgl_companyCodeInput", "pgl_houseBankInput",
                    "pgl_houseBankAccountInput", "pgl_glAccountInput",
                    "pgl_referenceInput", "pgl_headerTextInput",
                    "pgl_currencyInput", "pgl_payAmountInput",
                    "pgl_documentDatePicker", "pgl_postingDatePicker"
                ];
                aAllFields.forEach(function (sId) {
                    const oCtrl = this.byId(sId);
                    if (oCtrl) { oCtrl.setEditable(true); }
                }.bind(this));

                this._setPostingInfoVisible(false, false);
                this._setDefaultCompanyCode(); 
            }
        },      
        _setDefaultCompanyCode: function () {
            const oDataModel = this.getOwnerComponent().getModel();
            const that = this;

            oDataModel.read("/empOrg", {
                success: function (oData) {
                    const aResults = oData && oData.results ? oData.results : [];
                    const oCompCodeInput = that.byId("pgl_companyCodeInput");

                    if (aResults.length > 0 && oCompCodeInput) {
                        oCompCodeInput.setValue(aResults[0].compCode || "");
                        oCompCodeInput.setEditable(false);
                    }
                },
                error: function (oError) {
                    console.warn("Could not fetch default Company Code:", oError);
                }
            });
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
            this.getView().setModel(new JSONModel({
                "values": {
                    "draftID": "", "compCode": "",
                    "docDate": "", "postDate": "", "refer": "", "headText": "",
                    "bankID": "", "bankAcc": "", "bankGL": "", "curr": "",
                    "payAmnt": parseFloat(0), "debit": parseFloat(0),
                    "credit": parseFloat(0), "balance": parseFloat(0)
                },
                "state": {
                    "draftID": "None", "compCode": "",
                    "docDate": "", "postDate": "", "refer": "", "headText": "",
                    "bankID": "", "bankAcc": "", "bankGL": "", "curr": "",
                    "payAmnt": "", "debit": "", "credit": "", "balance": ""
                },
                "visSave": true, "visUpd": false, "visSub": false,
                "visAddR": true, "visEditR": true
            }), "glData");

            this.getView().setModel(new JSONModel({ "items": [] }), "lineItems");

            this.getView().getModel("pageModel").setData({
                mode: "create",
                draftId: null,
                supplierName: ""
            });

            this._iSelectedLineItemIndex = -1;
            this._sLineItemMode = "add";

            const oTable      = this.byId("pglitemtable");
            const oEditButton = this.byId("pglItemsInfoedit");
            if (oTable)      { oTable.removeSelections(true); }
            if (oEditButton) { oEditButton.setEnabled(false); }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Save / Update button visibility
        // ─────────────────────────────────────────────────────────────────────
        _updateSaveButton: function (sMode) {
            const sDraftSt = this.getView().getModel("pageModel").getProperty("/draftSt");
            if (sDraftSt === "2" || sDraftSt === "3") { return; }

            const oGlData = this.getView().getModel("glData");
            if (!oGlData) { return; }
            oGlData.setProperty("/visSave", sMode !== "edit");
            oGlData.setProperty("/visUpd",  sMode === "edit");
        },

        // _formatDateDisplay: function (value) {
        //     if (!value) { return ""; }

        //     var oDate = null;
        //     if (value instanceof Date) {
        //         oDate = value;
        //     } else if (typeof value === "string" && value.indexOf("/Date(") === 0) {
        //         var sTs = value.replace("/Date(", "").replace(")/", "").split("+")[0];
        //         oDate = new Date(parseInt(sTs));
        //     } else if (typeof value === "string") {
        //         oDate = new Date(value);
        //     }

        //     if (!oDate || isNaN(oDate.getTime())) { return ""; }

        //     var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
        //     return oDateFormat.format(oDate);
        // },
        // New helper (put near _toODataDate2)
        _formatDatePGL: function (value) {
            if (!value) { return ""; }
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
            if (!oDate || isNaN(oDate.getTime())) { return ""; }
            return DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" }).format(oDate);
        },

        _loadDraft2: function (sDraftId) {
            
            const oDataModel = this.getOwnerComponent().getModel();
            const that       = this;

            this.getView().setBusy(true);

            oDataModel.read("/head('" + sDraftId + "')", {
                urlParameters: { "$expand": "to_item" },

                success: function (oHead) {
                    that.getView().setBusy(false);

                    var lineItems  = [];
                    var totCredit  = parseFloat(0);
                    var totDebit   = parseFloat(0);

                    // Bug 3 fixed — access .results
                    var aResults = (oHead.to_item && oHead.to_item.results) ? oHead.to_item.results : [];

                    for (var i = 0; i < aResults.length; i++) {
                        var itemData = aResults[i];

                        if (itemData.debCredInd === "H") {
                            totCredit = totCredit + parseFloat(itemData.amntDC) + parseFloat(itemData.taxAmntDC);
                        } else {
                            totDebit = totDebit + parseFloat(itemData.amntDC)  + parseFloat(itemData.taxAmntDC);
                        }

                        lineItems.push({
                            "glAccount":    itemData.glAccount,
                            "amount":       parseFloat(itemData.amntDC),
                            "costCenter":   itemData.costCntr,        // Bug 4 fixed
                            "profitCenter": itemData.profitCntr,
                            "wbs":          itemData.wbs,
                            "itemText":     itemData.itemText,
                            "taxCode":      itemData.taxCode,
                            "dcIndicator":  itemData.debCredInd,
                            "taxAmount":    parseFloat(itemData.taxAmntDC),
                            "amountWithTax": parseFloat(itemData.taxAmntDC) + parseFloat(itemData.amntDC)
                        });
                    }

                    // Bug 2 fixed — oHead.draftId not oHead.draftID
                    var glData1 = {
                        "values": {
                            "draftID":  oHead.draftId      || "",   // Bug 2 fixed
                            "compCode": oHead.compCode      || "",
                            "docDate":  oHead.docDate,
                            "postDate": oHead.postingDate,
                            "refer":    oHead.reference     || "",
                            "headText": oHead.headText      || "",
                            "bankID":   oHead.bankKey       || "",
                            "bankAcc":  oHead.bankAcc       || "",
                            "bankGL":   oHead.bankGL        || "",
                            "curr":     oHead.curr          || "",
                            "payAmnt":  parseFloat(oHead.payAmnt || 0),
                            "debit":    totDebit,
                            "credit":   totCredit,
                            "balance":  parseFloat(oHead.payAmnt || 0) + totCredit - totDebit
                        },
                        "state":{"draftID":"None","compCode":"None",
                    "docDate":"None","postDate":"None","refer":"None","headText":"None","bankID":"None","bankAcc":"None",
                    "bankGL":"None","curr":"None","payAmnt":"None","debit":"None","credit":"None","balance":"None"
                    },
                    "edit":{
                       "compCode":false, "bankID":false,"bankAcc":false,"bankGL":false 
                    } ,
                        "visSave": false, "visUpd": false, "visSub": false, "visReSub":false, "visPost":false,
                        "visAddR": false,  "visEditR": false, "itemSel": "None"
                    };
                    if (oHead.draftSt === '1'){
                        glData1.visUpd = true;
                        glData1.visSub = true;
                        glData1.visAddR = true;
                        glData1.visEditR = true;
                        glData1.itemSel = "SingleSelectMaster";
                    }else{
                        if (oHead.draftSt === '4'){
                            glData1.visReSub = true;
                            glData1.visUpd = true;
                            glData1.visAddR = true;
                            glData1.visEditR = true;
                            glData1.itemSel = "SingleSelectMaster";
                        }else{
                            if (oHead.draftSt === '3' || oHead.draftSt === '6' ){
                                glData1.visPost = true;
                            }
                        }
                    }

                    that.getView().setModel(new JSONModel( glData1 ), "glData");
 
                    that.getView().setModel(new JSONModel({ "items": lineItems }), "lineItems");

                    // Apply correct display mode based on draftSt
                    that._applyDisplayMode(oHead.draftSt);
                    that._calcLineItemTotals();
                    const oPageModel = that.getView().getModel("pageModel");
                    oPageModel.setProperty("/postDoc",     oHead.postDoc     || "");
                    oPageModel.setProperty("/msg",         oHead.msg         || "");
                    oPageModel.setProperty("/draftSt",     oHead.draftSt     || "");
                    oPageModel.setProperty("/compCode",    oHead.compCode    || "");
                    oPageModel.setProperty("/fiscYear",    oHead.fiscYear    || "");
                    oPageModel.setProperty("/reference",   oHead.reference   || "");
                    oPageModel.setProperty("/headText",    oHead.headText    || "");
                    oPageModel.setProperty("/bankKey",     oHead.bankKey     || "");
                    oPageModel.setProperty("/bankAcc",     oHead.bankAcc     || "");
                    oPageModel.setProperty("/bankGL",      oHead.bankGL      || "");
                    oPageModel.setProperty("/curr",        oHead.curr        || "");
                    oPageModel.setProperty("/payAmnt",     oHead.payAmnt     || "");
                    oPageModel.setProperty("/docDate",     that._formatDatePGL(oHead.docDate));
                    oPageModel.setProperty("/postingDate", that._formatDatePGL(oHead.postingDate));

                    // Load approvers for statuses 2–6
                    if (["2", "3", "4", "5", "6"].indexOf(oHead.draftSt) !== -1) {
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
            const fnFormatDate = function (value) {
                if (!value) { return ""; }
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
                    return String(oDate.getDate()).padStart(2, "0") + "/" +
                        String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
                        oDate.getFullYear();
                }
                return "";
            };

            // Set glData values
            this.getView().setModel(new JSONModel({
                "values": {
                    "draftID":  oHead.draftId      || "",
                    "compCode": oHead.compCode     || "",
                    "docDate":  fnFormatDate(oHead.docDate),
                    "postDate": fnFormatDate(oHead.postingDate),
                    "refer":    oHead.reference    || "",
                    "headText": oHead.headText     || "",
                    "bankID":   oHead.bankKey      || "",
                    "bankAcc":  oHead.bankAcc      || "",
                    "bankGL":   oHead.bankGL       || "",
                    "curr":     oHead.curr         || "",
                    "payAmnt":  parseFloat(oHead.payAmnt || 0),
                    "debit":    parseFloat(0),
                    "credit":   parseFloat(0),
                    "balance":  parseFloat(0)
                },
                "state": {
                    "draftID": "None", "compCode": "", "docDate": "", "postDate": "",
                    "refer": "", "headText": "", "bankID": "", "bankAcc": "",
                    "bankGL": "", "curr": "", "payAmnt": "", "debit": "", "credit": "", "balance": ""
                },
                "visSave": false, "visUpd": false, "visSub": false,
                "visAddR": true,  "visEditR": true
            }), "glData");

            // Set pageModel
            const oPageModel = this.getView().getModel("pageModel");
            oPageModel.setProperty("/postDoc",     oHead.postDoc     || "");
            oPageModel.setProperty("/msg",         oHead.msg         || "");
            oPageModel.setProperty("/draftSt",     oHead.draftSt     || "");
            oPageModel.setProperty("/draftId",     oHead.draftId     || "");
            oPageModel.setProperty("/compCode",    oHead.compCode    || "");
            oPageModel.setProperty("/fiscYear",    oHead.fiscYear    || "");
            oPageModel.setProperty("/reference",   oHead.reference   || "");
            oPageModel.setProperty("/headText",    oHead.headText    || "");
            oPageModel.setProperty("/bankKey",     oHead.bankKey     || "");
            oPageModel.setProperty("/bankAcc",     oHead.bankAcc     || "");
            oPageModel.setProperty("/bankGL",      oHead.bankGL      || "");
            oPageModel.setProperty("/curr",        oHead.curr        || "");
            oPageModel.setProperty("/payAmnt",     oHead.payAmnt     || "");
            oPageModel.setProperty("/docDate",     fnFormatDate(oHead.docDate));
            oPageModel.setProperty("/postingDate", fnFormatDate(oHead.postingDate));

            // Map line items
            const aBackendItems = (oHead.to_item && oHead.to_item.results) ? oHead.to_item.results : [];
            const aMappedItems = aBackendItems.map(function (oItem) {
                const fAmt     = parseFloat(oItem.amntLC    || "0");
                const fTaxAmt  = parseFloat(oItem.taxAmntLC || "0");
                const fWithTax = parseFloat(oItem.refAmntLC || "0") || (fAmt + fTaxAmt);
                const sWbs     = (oItem.wbs || "").replace(/^0+$/, "");

                return {
                    glAccount:    oItem.glAccount  || "",
                    amount:       fAmt,
                    costCenter:   oItem.costCntr   || "",
                    profitCenter: oItem.profitCntr || "",
                    wbs:          sWbs,
                    itemText:     oItem.itemText   || "",
                    taxCode:      oItem.taxCode    || "",
                    dcIndicator:  oItem.debCredInd || "",
                    taxAmount:    fTaxAmt,
                    amountWithTax: fWithTax,
                    itemId:       oItem.itemId     || ""
                };
            });

            this.getView().setModel(new JSONModel({ items: aMappedItems }), "lineItems");

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
            // this._bLineItemsReadOnly = bDisplayForm;

            // Show/hide edit vs display form box
            const oEditFormBox    = this.byId("gl_editFormBox");
            const oDisplayFormBox = this.byId("gl_displayFormBox");
            if (oEditFormBox)    { oEditFormBox.setVisible(!bDisplayForm);  }
            if (oDisplayFormBox) { oDisplayFormBox.setVisible(bDisplayForm); }

            // Drive all button visibility via glData model flags
            const oGlData = this.getView().getModel("glData");

            // if (bIsInApproval) {
            //     oGlData.setProperty("/visSave",  false);
            //     oGlData.setProperty("/visUpd",   false);
            //     oGlData.setProperty("/visSub",   false);
            //     this._setPostingInfoVisible(false, false);

            // } else if (bIsApproved) {
            //     oGlData.setProperty("/visSave",  false);
            //     oGlData.setProperty("/visUpd",   false);
            //     oGlData.setProperty("/visSub",   false);
            //     this._setPostingInfoVisible(false, false);

            // } else if (bIsCreated) {
            //     oGlData.setProperty("/visSave",  false);
            //     oGlData.setProperty("/visUpd",   true);
            //     oGlData.setProperty("/visSub",   true);

            // } else if (bIsRejected) {
            //     oGlData.setProperty("/visSave",  false);
            //     oGlData.setProperty("/visUpd",   false);
            //     oGlData.setProperty("/visSub",   false);

            // } else if (bIsPostErr) {
            //     oGlData.setProperty("/visSave",  false);
            //     oGlData.setProperty("/visUpd",   false);
            //     oGlData.setProperty("/visSub",   false);
            //     this._setPostingInfoVisible(false, true);

            // } else if (bIsPosted) {
            //     oGlData.setProperty("/visSave",  false);
            //     oGlData.setProperty("/visUpd",   false);
            //     oGlData.setProperty("/visSub",   false);
            //     this._setPostingInfoVisible(true, false);

            // } else {
            //     // Create mode
            //     oGlData.setProperty("/visSave",  true);
            //     oGlData.setProperty("/visUpd",   false);
            //     oGlData.setProperty("/visSub",   true);
            // }

            // // Post and Resubmit buttons — still need byId since they have no glData binding in XML
            // const oPostButton     = this.byId("_IDGenButton2622gl");
            // const oResubmitButton = this.byId("resubmitButtongl");

            // if (oPostButton) {
            //     oPostButton.setVisible(bIsApproved || bIsPostErr);
            // }
            // if (oResubmitButton) {
            //     oResubmitButton.setVisible(bIsRejected);
            // }

            // Approver table visibility
            const oAprvrTable = this.byId("gl_aprvrTable");
            if (oAprvrTable) {
                oAprvrTable.setVisible(
                    bIsInApproval || bIsApproved || bIsPosted || bIsPostErr || bIsRejected
                );
            }

            // Field editability — only relevant when edit form is shown
            // if (!bDisplayForm) {
            //     const aAlwaysLocked = ["pgl_companyCodeInput","pgl_houseBankInput",
            //                         "pgl_houseBankAccountInput","pgl_glAccountInput"];
            //     const aEditable     = ["pgl_referenceInput","pgl_headerTextInput",
            //                         "pgl_currencyInput","pgl_payAmountInput",
            //                         "pgl_documentDatePicker","pgl_postingDatePicker"];

            //     if (bIsCreated || bIsRejected) {
            //         aAlwaysLocked.forEach(function (sId) {
            //             const oCtrl = this.byId(sId);
            //             if (oCtrl) { oCtrl.setEditable(false); }
            //         }.bind(this));
            //         aEditable.forEach(function (sId) {
            //             const oCtrl = this.byId(sId);
            //             if (oCtrl) { oCtrl.setEditable(true); }
            //         }.bind(this));
            //     } else {
            //         aAlwaysLocked.concat(aEditable).forEach(function (sId) {
            //             const oCtrl = this.byId(sId);
            //             if (oCtrl) { oCtrl.setEditable(true); }
            //         }.bind(this));
            //     }
            // }
 
            // const oAddBtn    = this.byId("pglItemsInfoBtn");
            // const oEditBtn   = this.byId("pglItemsInfoedit");
            // const oDeleteBtn = this.byId("pglItemsInfodelete");

            // if (oAddBtn)    { oAddBtn.setEnabled(!bDisplayForm); }
            // if (oEditBtn)   { oEditBtn.setEnabled(!bDisplayForm && this._iSelectedLineItemIndex >= 0); }
            // if (oDeleteBtn) { oDeleteBtn.setEnabled(!bDisplayForm && this._iSelectedLineItemIndex >= 0); }
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

            var oDate = value instanceof Date ? value : new Date(value);
            if (isNaN(oDate.getTime())) { return null; }

            // Build a Date at UTC midnight using the same Y/M/D the user picked,
            // so serializing to UTC doesn't roll the date back a day.
            return new Date(Date.UTC(oDate.getFullYear(), oDate.getMonth(), oDate.getDate()));
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

        ///Revamp-01        
        calcBalance(oEvent){
            var glData = this.getView().getModel("glData").getData();
            glData.values.balance = parseFloat(glData.values.payAmnt) + parseFloat(glData.values.credit) - parseFloat(glData.values.debit);
            this.getView().getModel("glData").setData(glData);
        },

        onSave: function () {
            var oGlModel  = this.getView().getModel("glData");
            var oGlData   = oGlModel.getData();          // full root — values + visSave etc.
            var glValues  = oGlData.values;              // just the field values

            var lineItems = this.getView().getModel("lineItems").getData().items || [];

            var oPayload = {
                compCode:    glValues.compCode,
                draftType:   "4",
                docDate:     this._toODataDate2(glValues.docDate),
                postingDate: this._toODataDate2(glValues.postDate),
                reference:   glValues.refer,
                headText:    glValues.headText,
                bankKey:     glValues.bankID,
                bankAcc:     glValues.bankAcc,
                bankGL:      glValues.bankGL,
                curr:        glValues.curr,
                payAmnt:     parseFloat(glValues.payAmnt || 0).toFixed(3),
                action:      "I",
                to_item:     []
            };

            lineItems.forEach(function (item1, i) {
                oPayload.to_item.push({
                    "itemId":     String(i + 1).padStart(3, "0"),
                    "itemTy":     "1",
                    "amntLC":     parseFloat(item1.amount    || 0).toFixed(3),
                    "amntDC":     parseFloat(item1.amount    || 0).toFixed(3),
                    "taxAmntLC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                    "taxAmntDC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                    "compCode":   glValues.compCode,
                    "docCurr":    glValues.curr,
                    "compCurr":   glValues.curr,
                    "debCredInd": item1.dcIndicator === "S" ? "S" : "H",
                    "costCntr":   item1.costCenter   || "",
                    "profitCntr": item1.profitCenter || "",
                    "wbs":        item1.wbs          || "",
                    "itemText":   item1.itemText     || "",
                    "taxCode":    (item1.taxCode     || "").trim().substring(0, 2),
                    "glAccount":  item1.glAccount    || ""
                });
            });

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);
            var that = this;

            oDataModel.create("/head", oPayload, {
                success: function (oCreatedData) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);

                   // Save done — hide Save, show Update + Submit
                    oGlModel.setProperty("/visSave", false);
                    oGlModel.setProperty("/visUpd",  true);   // Update now visible
                    oGlModel.setProperty("/visSub",  true);   // Submit stays visible
                    oGlModel.setProperty("/values/draftID", oCreatedData.draftId || "");

                    // Lock the always-locked fields now that doc is created
                    var aLockedFields = [
                        "pgl_companyCodeInput", "pgl_houseBankInput",
                        "pgl_houseBankAccountInput", "pgl_glAccountInput"
                    ];
                    aLockedFields.forEach(function (sId) {
                        var oCtrl = that.byId(sId);
                        if (oCtrl) { oCtrl.setEditable(false); }
                    });

                    var oPageModel = that.getView().getModel("pageModel");
                    oPageModel.setProperty("/mode",    "edit");
                    oPageModel.setProperty("/draftId", oCreatedData.draftId || "");

                    MessageToast.show("Saved successfully. Draft ID: " + oCreatedData.draftId);
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    that._showError(oError, "Failed to save.");
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Update (action "U", draftType hardcoded "4")
        // ─────────────────────────────────────────────────────────────────────
        onUpdate: function () {
            var glData        = this.getView().getModel("glData").getData();
            var oPageModel    = this.getView().getModel("pageModel");
            var sSavedDraftId = oPageModel.getProperty("/draftId");

            // Balance check
            const fLineBalance = this._calcLineItemTotals();
            if (Math.abs(fLineBalance) >= 0.001) {
                MessageBox.error(
                    "Document cannot be saved. Balance must be zero.\n" +
                    "Current Balance: " + fLineBalance.toFixed(3)
                );
                return;
            }

            var lineItems = this.getView().getModel("lineItems").getData().items || [];
            var oPayload = {
                draftId:     sSavedDraftId,
                compCode:    glData.values.compCode,
                draftType:   "4",
                docDate:     this._toODataDate2(glData.values.docDate),
                postingDate: this._toODataDate2(glData.values.postDate),
                reference:   glData.values.refer,
                headText:    glData.values.headText,
                bankKey:     glData.values.bankID,
                bankAcc:     glData.values.bankAcc,
                bankGL:      glData.values.bankGL,
                curr:        glData.values.curr,
                payAmnt:     parseFloat(glData.values.payAmnt || 0).toFixed(3),
                action:      "U",
                to_item:     []
            };

            lineItems.forEach(function (item1, i) {
                oPayload.to_item.push({
                    "itemId":     String(i + 1).padStart(3, "0"),
                    "itemTy":     "1",
                    "amntLC":     parseFloat(item1.amount    || 0).toFixed(3),
                    "amntDC":     parseFloat(item1.amount    || 0).toFixed(3),
                    "taxAmntLC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                    "taxAmntDC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                    "compCode":   glData.values.compCode,
                    "docCurr":    glData.values.curr,
                    "compCurr":   glData.values.curr,
                    "debCredInd": item1.dcIndicator === "S" ? "S" : "H",
                    "costCntr":   item1.costCenter   || "",
                    "profitCntr": item1.profitCenter || "",
                    "wbs":        item1.wbs          || "",
                    "itemText":   item1.itemText     || "",
                    "taxCode":    (item1.taxCode     || "").trim().substring(0, 2),
                    "glAccount":  item1.glAccount    || ""
                });
            });

            const oDataModel = this.getOwnerComponent().getModel();
            oDataModel.setUseBatch(false);
            this._setBusyDialog(true);
            var that = this;

            oDataModel.create("/head", oPayload, {
                success: function () {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);

                    // ── Recalc totals to keep display consistent ──
                    that._calcLineItemTotals();

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
            const that        = this;
            const oPageModel  = this.getView().getModel("pageModel");
            const sMode       = oPageModel.getProperty("/mode");
            const oDataModel  = this.getOwnerComponent().getModel();

          const fnSubmit = function (sDraftId) {
            if (!sDraftId) {
                that._setBusyDialog(false);
                MessageBox.error("Submit failed: Draft ID is missing.");
                return;
            }

            oDataModel.setUseBatch(false);
            that._setBusyDialog(true);
            oDataModel.create("/head", { draftId: sDraftId, action: "S" }, {
                success: function (oData) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);

                    if (oData.procStat === "E") {
                        // Backend rejected — show the error message, stay on page
                        MessageBox.error(oData.msg || "Submission failed. Please check the document.");
                    } else {
                        MessageBox.success("Payment submitted successfully. Draft ID: " + sDraftId, {
                            onClose: function () {
                                that.getOwnerComponent().getRouter().navTo("RouteNewDoc");
                            }
                        });
                    }
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    that._showError(oError, "Failed to submit payment.");
                }
            });
        };

            // Balance check before either path
            const fLineBalance = this._calcLineItemTotals();
            if (Math.abs(fLineBalance) >= 0.001) {
                MessageBox.error(
                    "Document cannot be submitted. Balance must be zero.\n" +
                    "Current Balance: " + fLineBalance.toFixed(3)
                );
                return;
            }

            if (sMode === "edit") {
                // Reuse onUpdate logic — intercept success to chain fnSubmit
                const sSavedDraftId = oPageModel.getProperty("/draftId");
                var glData    = this.getView().getModel("glData").getData();
                var lineItems = this.getView().getModel("lineItems").getData().items || [];

                var oPayload = {
                    draftId:     sSavedDraftId,
                    compCode:    glData.values.compCode,
                    draftType:   "4",
                    docDate:     this._toODataDate2(glData.values.docDate),
                    postingDate: this._toODataDate2(glData.values.postDate),
                    reference:   glData.values.refer,
                    headText:    glData.values.headText,
                    bankKey:     glData.values.bankID,
                    bankAcc:     glData.values.bankAcc,
                    bankGL:      glData.values.bankGL,
                    curr:        glData.values.curr,
                    payAmnt:     parseFloat(glData.values.payAmnt || 0).toFixed(3),
                    action:      "U",
                    to_item:    []
                };

                lineItems.forEach(function (item1, i) {
                    oPayload.to_item.push({
                        "itemId":     String(i + 1).padStart(3, "0"),
                        "itemTy":     "1",
                        "amntLC":     parseFloat(item1.amount    || 0).toFixed(3),
                        "amntDC":     parseFloat(item1.amount    || 0).toFixed(3),
                        "taxAmntLC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                        "taxAmntDC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                        "compCode":   glData.values.compCode,
                        "docCurr":    glData.values.curr,
                        "compCurr":   glData.values.curr,
                        "debCredInd": item1.dcIndicator === "S" ? "S" : "H",
                        "costCntr":   item1.costCenter   || "",
                        "profitCntr": item1.profitCenter || "",
                        "wbs":        item1.wbs          || "",
                        "itemText":   item1.itemText     || "",
                        "taxCode":    (item1.taxCode     || "").trim().substring(0, 2),
                        "glAccount":  item1.glAccount    || ""
                    });
                });

                oDataModel.setUseBatch(false);
                that._setBusyDialog(true);
                oDataModel.create("/head", oPayload, {
                    success: function () {
                        oDataModel.setUseBatch(true);
                        fnSubmit(sSavedDraftId);
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
                        that._showError(oError, "Failed to update before submit.");
                    }
                });

            } else {
                // Create mode — reuse onSave payload, chain fnSubmit on success
                var glData    = this.getView().getModel("glData").getData();
                var lineItems = this.getView().getModel("lineItems").getData().items || [];

                var oPayload = {
                    compCode:    glData.values.compCode,
                    draftType:   "4",
                    docDate:     this._toODataDate2(glData.values.docDate),
                    postingDate: this._toODataDate2(glData.values.postDate),
                    reference:   glData.values.refer,
                    headText:    glData.values.headText,
                    bankKey:     glData.values.bankID,
                    bankAcc:     glData.values.bankAcc,
                    bankGL:      glData.values.bankGL,
                    curr:        glData.values.curr,
                    payAmnt:     parseFloat(glData.values.payAmnt || 0).toFixed(3),
                    action:      "I",
                    to_item:    []
                };

                lineItems.forEach(function (item1, i) {
                    oPayload.to_item.push({
                        "itemId":     String(i + 1).padStart(3, "0"),
                        "itemTy":     "1",
                        "amntLC":     parseFloat(item1.amount    || 0).toFixed(3),
                        "amntDC":     parseFloat(item1.amount    || 0).toFixed(3),
                        "taxAmntLC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                        "taxAmntDC":  parseFloat(item1.taxAmount || 0).toFixed(3),
                        "compCode":   glData.values.compCode,
                        "docCurr":    glData.values.curr,
                        "compCurr":   glData.values.curr,
                        "debCredInd": item1.dcIndicator === "S" ? "S" : "H",
                        "costCntr":   item1.costCenter   || "",
                        "profitCntr": item1.profitCenter || "",
                        "wbs":        item1.wbs          || "",
                        "itemText":   item1.itemText     || "",
                        "taxCode":    (item1.taxCode     || "").trim().substring(0, 2),
                        "glAccount":  item1.glAccount    || ""
                    });
                });

                oDataModel.setUseBatch(false);
                that._setBusyDialog(true);
                oDataModel.create("/head", oPayload, {
                    success: function (oCreatedData) {
                        oDataModel.setUseBatch(true);
                        const sDraftId = oCreatedData.draftId;
                        oPageModel.setProperty("/draftId", sDraftId);
                        fnSubmit(sDraftId);
                    },
                    error: function (oError) {
                        that._setBusyDialog(false);
                        oDataModel.setUseBatch(true);
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
                fnSet("pglDlg_taxAmount",    oRow.taxAmount); 
                fnSet("pglDlg_amtWithTax",   oRow.amountWithTax);

                // Restore calc cache
                that._fCurrentTaxAmount  = parseFloat(oRow.taxAmount)     || 0;
                that._fCurrentAmtWithTax = parseFloat(oRow.amountWithTax) || 0;
            // const sKey   = oRow.dcIndicator === "Debit" ? "S" : "H";
                const sKey   = oRow.dcIndicator; 
                const oCombo = oView.byId("pglDlg_dcCombo");
                if (oCombo) { oCombo.setSelectedKey(sKey); }


                oView.byId("pglDlg_taxAmountLabel") ?.setVisible(true);     
                oView.byId("pglDlg_taxAmount")      ?.setVisible(true);
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
                debugger;
            const sKey   = oEvent.getSource().getSelectedKey();
            const bShow  = sKey === "S" || sKey === "H"; 
            const oView  = this.getView();

            oView.byId("pglDlg_amtWithTaxLabel")?.setVisible(bShow);
            oView.byId("pglDlg_amtWithTax")     ?.setVisible(bShow);

            // Recalculate when DC changes
            if (bShow) { this._calcAmountWithTax(); }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Add / Update row in JSON model
        // ─────────────────────────────────────────────────────────────────────
        // onAddLineItem: function () {
        //     var oGlModel   = this.getView().getModel("glData");
        //     var glData     = oGlModel.getData();
        //     var itemData   = this.getView().getModel("itemData").getData();
        //     var oLineModel = this.getView().getModel("lineItems");
        //     var lineItems  = oLineModel.getData();

        //     if (itemData.amountWithTax === "" || itemData.amountWithTax === 0) {
        //         itemData.amountWithTax = itemData.amount;
        //     }

        //     // Normalize dcIndicator: ComboBox uses key "S"/"H", model stores "Debit"/"Credit"
        //     // Handle both so edit round-trips work correctly
        //     // Normalize whatever the ComboBox key returns → display text
        //     // var sDCKey = itemData.dcIndicator;
        //     // if (sDCKey === "S" || sDCKey === "Debit")   { itemData.dcIndicator = "Debit";  }
        //     // if (sDCKey === "H" || sDCKey === "Credit")  { itemData.dcIndicator = "Credit"; }

        //     if (this._sLineItemMode === "edit" && this._iSelectedLineItemIndex >= 0) {
        //         // ── EDIT MODE: replace the existing row, recalc totals from scratch ──
        //         lineItems.items[this._iSelectedLineItemIndex] = itemData;

        //         // Recalculate debit/credit totals from all items
        //         var fTotalDebit  = 0;
        //         var fTotalCredit = 0;
        //         lineItems.items.forEach(function (oRow) {
        //             var fAmt = parseFloat(oRow.amountWithTax || oRow.amount || 0);
        //             if (oRow.dcIndicator === "Credit") {
        //                 fTotalCredit += fAmt;
        //             } else {
        //                 fTotalDebit  += fAmt;
        //             }
        //         });

        //         glData.values.debit   = fTotalDebit;
        //         glData.values.credit  = fTotalCredit;
        //         glData.values.balance = parseFloat(glData.values.payAmnt || 0)
        //                                 + fTotalCredit - fTotalDebit;

        //         // Reset selection state
        //         this._iSelectedLineItemIndex = -1;
        //         this._sLineItemMode          = "add";

        //         var oTable      = this.byId("pglitemtable");
        //         var oEditButton = this.byId("pglItemsInfoedit");
        //         if (oTable)      { oTable.removeSelections(true); }
        //         if (oEditButton) { oEditButton.setEnabled(false); }

        //     } else {
        //         // ── ADD MODE: push new row ──
        //         lineItems.items.push(itemData);

        //         if (itemData.dcIndicator === "H") {
        //             glData.values.credit = parseFloat(glData.values.credit || 0)
        //                                 + parseFloat(itemData.amountWithTax || itemData.amount || 0);
        //         } else {
        //             glData.values.debit  = parseFloat(glData.values.debit  || 0)
        //                                 + parseFloat(itemData.amountWithTax || itemData.amount || 0);
        //         }

        //         glData.values.balance = parseFloat(glData.values.payAmnt || 0)
        //                             + parseFloat(glData.values.credit  || 0)
        //                             - parseFloat(glData.values.debit   || 0);
        //     }

        //     oGlModel.setData(glData);
        //     this.getView().getModel("lineItems").setData(lineItems);

        //     if (this._oPGLLineItemDialog) {
        //         this._oPGLLineItemDialog.close();
        //     }
        // },
        onAddLineItem: function () {
            var oGlModel   = this.getView().getModel("glData");
            var itemData   = this.getView().getModel("itemData").getData();
            var oLineModel = this.getView().getModel("lineItems");
            var lineItems  = oLineModel.getData();

            if (itemData.amountWithTax === "" || itemData.amountWithTax === 0) {
                itemData.amountWithTax = itemData.amount;
            }

            if (this._sLineItemMode === "edit" && this._iSelectedLineItemIndex >= 0) {
                lineItems.items[this._iSelectedLineItemIndex] = itemData;
                this._iSelectedLineItemIndex = -1;
                this._sLineItemMode          = "add";

                var oTable      = this.byId("pglitemtable");
                var oEditButton = this.byId("pglItemsInfoedit");
                if (oTable)      { oTable.removeSelections(true); }
                if (oEditButton) { oEditButton.setEnabled(false); }
            } else {
                lineItems.items.push(itemData);
            }

            this.getView().getModel("lineItems").setData(lineItems);
            this._calcLineItemTotals();   // ← single source of truth for debit/credit/balance

            if (this._oPGLLineItemDialog) {
                this._oPGLLineItemDialog.close();
            }
        },
     
        // ─────────────────────────────────────────────────────────────────────
        // Cancel dialog
        // ─────────────────────────────────────────────────────────────────────
        onCancelLineItem: function () {
            if (this._oPGLLineItemDialog) {
                this._oPGLLineItemDialog.close();
            }
        },
        // onDeleteLineItem: function () {
        //     const iIndex = this._iSelectedLineItemIndex;
        //     if (iIndex === undefined || iIndex < 0) {
        //         MessageBox.error("Please select a line item to delete.");
        //         return;
        //     }

        //     const that = this;

        //     MessageBox.confirm("Are you sure you want to delete this line item?", {
        //         title:   "Confirm Delete",
        //         actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        //         onClose: function (sAction) {
        //             if (sAction !== MessageBox.Action.YES) { return; }

        //             var oGlModel   = that.getView().getModel("glData");
        //             var glData     = oGlModel.getData();
        //             var oLineModel = that.getView().getModel("lineItems");
        //             var lineItems  = oLineModel.getData();

        //             // Remove the row
        //             lineItems.items.splice(iIndex, 1);

        //             // Recalculate totals from scratch
        //             var fTotalDebit  = 0;
        //             var fTotalCredit = 0;
        //             lineItems.items.forEach(function (oRow) {
        //                 var fAmt = parseFloat(oRow.amountWithTax || oRow.amount || 0);
        //                 if (oRow.dcIndicator === "H") {
        //                     fTotalCredit += fAmt;
        //                 } else {
        //                     fTotalDebit  += fAmt;
        //                 }
        //             });

        //             glData.values.debit   = fTotalDebit;
        //             glData.values.credit  = fTotalCredit;
        //             glData.values.balance = parseFloat(glData.values.payAmnt || 0)
        //                                 + fTotalCredit - fTotalDebit;

        //             oGlModel.setData(glData);
        //             oLineModel.setData(lineItems);

        //             // Reset selection state
        //             that._iSelectedLineItemIndex = -1;
        //             that._sLineItemMode          = "add";

        //             var oTable        = that.byId("pglitemtable");
        //             var oEditButton   = that.byId("pglItemsInfoedit");
        //             var oDeleteButton = that.byId("pglItemsInfodelete");
        //             if (oTable)        { oTable.removeSelections(true);  }
        //             if (oEditButton)   { oEditButton.setEnabled(false);  }
        //             if (oDeleteButton) { oDeleteButton.setEnabled(false); }

        //             MessageToast.show("Line item deleted.");
        //         }
        //     });
        // },
        onDeleteLineItem: function () {
            const iIndex = this._iSelectedLineItemIndex;
            if (iIndex === undefined || iIndex < 0) {
                MessageBox.error("Please select a line item to delete.");
                return;
            }

            const that = this;

            MessageBox.confirm("Are you sure you want to delete this line item?", {
                title:   "Confirm Delete",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.YES) { return; }

                    var oLineModel = that.getView().getModel("lineItems");
                    var lineItems  = oLineModel.getData();

                    // Remove the row
                    lineItems.items.splice(iIndex, 1);

                    oLineModel.setData(lineItems);
                    that._calcLineItemTotals();   // single source of truth for debit/credit/balance

                    // Reset selection state
                    that._iSelectedLineItemIndex = -1;
                    that._sLineItemMode          = "add";

                    var oTable        = that.byId("pglitemtable");
                    var oEditButton   = that.byId("pglItemsInfoedit");
                    var oDeleteButton = that.byId("pglItemsInfodelete");
                    if (oTable)        { oTable.removeSelections(true);  }
                    if (oEditButton)   { oEditButton.setEnabled(false);  }
                    if (oDeleteButton) { oDeleteButton.setEnabled(false); }

                    MessageToast.show("Line item deleted.");
                }
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Clear dialog fields before opening
        // ─────────────────────────────────────────────────────────────────────
        _clearLineItemDialog: function () {
            const oView = this.getView();

            ["pglDlg_glAccount","pglDlg_amount","pglDlg_costCenter",
            "pglDlg_profitCenter","pglDlg_wbs","pglDlg_itemText",
            "pglDlg_taxCode","pglDlg_amtWithTax","pglDlg_taxAmount"]
                .forEach(function (sId) {
                    const oCtrl = oView.byId(sId);
                    if (oCtrl) { oCtrl.setValue(""); }
                });

            const oCombo = oView.byId("pglDlg_dcCombo");
            if (oCombo) { oCombo.setSelectedKey(""); }

            oView.byId("pglDlg_taxAmountLabel") ?.setVisible(false);   
            oView.byId("pglDlg_taxAmount")      ?.setVisible(false);    
            oView.byId("pglDlg_amtWithTaxLabel")?.setVisible(false);
            oView.byId("pglDlg_amtWithTax")     ?.setVisible(false);

            this._fCurrentTaxAmount  = 0;
            this._fCurrentAmtWithTax = 0;
        },

        // ─────────────────────────────────────────────────────────────────────
        // Row selection — enable/disable Edit button
        // ─────────────────────────────────────────────────────────────────────
        onLineItemSelectionChange: function () {
            const oTable        = this.byId("pglitemtable");
            const oEditButton   = this.byId("pglItemsInfoedit");
            const oDeleteButton = this.byId("pglItemsInfodelete");
            const aSelected     = oTable.getSelectedItems();

            //     if (this._bLineItemsReadOnly) {
            //     // Display-only draft — never enable Edit/Delete regardless of selection
            //     this._iSelectedLineItemIndex = -1;
            //     if (oEditButton)   { oEditButton.setEnabled(false);  }
            //     if (oDeleteButton) { oDeleteButton.setEnabled(false); }
            //     oTable.removeSelections(true);
            //     return;
            // }


            if (aSelected.length > 0) {
                this._iSelectedLineItemIndex = oTable.getItems().indexOf(aSelected[0]);
                if (oEditButton)   { oEditButton.setEnabled(true);   }
                if (oDeleteButton) { oDeleteButton.setEnabled(true);  }
            } else {
                this._iSelectedLineItemIndex = -1;
                if (oEditButton)   { oEditButton.setEnabled(false);  }
                if (oDeleteButton) { oDeleteButton.setEnabled(false); }
            }
        },
        onDlgAmountChange: function () {
            this._calcAmountWithTax();
            // const oView  = this.getView();
            // oView.byId("pglDlg_amtWithTaxLabel")?.setVisible();
            // oView.byId("pglDlg_amtWithTax")     ?.setVisible();
        },

        onDlgTaxCodeChange: function () {
            this._calcAmountWithTax();
            this._showTaxFields();
        },
        _showTaxFields: function () {
            const oView = this.getView();
            oView.byId("pglDlg_taxAmountLabel") ?.setVisible(true);
            oView.byId("pglDlg_taxAmount")      ?.setVisible(true);
            oView.byId("pglDlg_amtWithTaxLabel")?.setVisible(true);
            oView.byId("pglDlg_amtWithTax")     ?.setVisible(true);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Calculate tax amount and amount with tax from taxCodes model
        // ─────────────────────────────────────────────────────────────────────
        _calcAmountWithTax: function () {
            const oView     = this.getView();
            const oItemData = oView.getModel("itemData");
            const oCombo    = oView.byId("pglDlg_dcCombo");

            if (!oItemData || !oCombo) { return; }
            if (!oCombo.getSelectedKey()) { return; }

            const fAmount  = parseFloat(oItemData.getProperty("/amount"))  || 0;
            const sTaxCode = (oItemData.getProperty("/taxCode") || "").trim();

            const oTaxModel = oView.getModel("taxCodes");
            let   fTaxRate  = 0;

            if (oTaxModel && sTaxCode) {
                const aItems = oTaxModel.getProperty("/items") || [];
                const oFound = aItems.find(function (o) { return o.TaxCode === sTaxCode; });
                if (oFound) { fTaxRate = parseFloat(oFound.TaxRate) || 0; }
            }

            const fTaxAmt  = (fAmount * fTaxRate) / 100;
            const fWithTax = fAmount + fTaxAmt;

            this._fCurrentTaxAmount  = fTaxAmt;
            this._fCurrentAmtWithTax = fWithTax;

            // Write back into itemData model so the bound field updates
            oItemData.setProperty("/taxAmount",    fTaxAmt);
            oItemData.setProperty("/amountWithTax", fWithTax);
        },
      
        _calcLineItemTotals: function () {
            const oLineModel = this.getView().getModel("lineItems");
            const aItems     = oLineModel ? (oLineModel.getProperty("/items") || []) : [];

            let fTotalDebit  = 0;
            let fTotalCredit = 0;

            aItems.forEach(function (oRow) {
                const fAmtWithTax = parseFloat(oRow.amountWithTax || "0") || 0;
                if (oRow.dcIndicator === "S") {
                    fTotalDebit += fAmtWithTax;
                } else if (oRow.dcIndicator === "H") {
                    fTotalCredit += fAmtWithTax;
                }
            });

            const oGlModel  = this.getView().getModel("glData");
            const fPayAmnt  = parseFloat((oGlModel && oGlModel.getProperty("/values/payAmnt")) || 0);

            // ── Use same formula as calcBalance ──
            const fBalance  = fPayAmnt + fTotalCredit - fTotalDebit;

            if (oGlModel) {
                oGlModel.setProperty("/values/debit",   fTotalDebit);
                oGlModel.setProperty("/values/credit",  fTotalCredit);
                oGlModel.setProperty("/values/balance", fBalance);
            }

            const oBalanceInput = this.byId("pgl_lineBalanceInput");
            if (oBalanceInput) {
                oBalanceInput.setValueState(
                    Math.abs(fBalance) < 0.001
                        ? sap.ui.core.ValueState.None
                        : sap.ui.core.ValueState.Error
                );
            }

            const oPageModel = this.getView().getModel("pageModel");
            if (oPageModel) {
                oPageModel.setProperty("/totalDebit",  fTotalDebit.toFixed(3));
                oPageModel.setProperty("/totalCredit", fTotalCredit.toFixed(3));
                oPageModel.setProperty("/lineBalance", fBalance.toFixed(3));
            }

            return fBalance;  // onUpdate/onSubmit check Math.abs(fBalance) < 0.001
        },
        formatDCIndicator: function (sKey) {
            if (sKey === "S") { return "Debit"; }
            if (sKey === "H") { return "Credit"; }
            return sKey || "";
        },

    });
});
