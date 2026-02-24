sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../modules/InputHelps"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, InputHelps) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.PostOutgoing", {
        InputHelps:InputHelps,
        
onInit: function () {
    const oModel = new JSONModel({
        openItems: [],
        itemsToBeCleared: []
    });
    this.getView().setModel(oModel, "openItems");

    // Page mode model: "create" or "edit"
    const oPageModel = new JSONModel({
        mode: "create",
        draftId: null
    });
    this.getView().setModel(oPageModel, "pageModel");

  

    // Attach route matched
    const oRouter = this.getOwnerComponent().getRouter();
    oRouter.getRoute("RoutePostOutgoing").attachMatched(this._onRouteMatched, this);
},

_onRouteMatched: function (oEvent) {
    const oArgs = oEvent.getParameter("arguments");
    const sDraftId = oArgs.draftId;

    if (sDraftId) {
        // Edit mode
        this.getView().getModel("pageModel").setData({
            mode: "edit",
            draftId: sDraftId
        });
        this._loadDraft(sDraftId);
    } else {
        // Create mode
        this.getView().getModel("pageModel").setData({
            mode: "create",
            draftId: null
        });
        this._resetPage();
    }
},

//--------------------View Setting Menu---------------------
onOpenViewSettings: function () {
    const that = this;
    if (!this._oViewSettingsDialog) {
        this.loadFragment({
            name: "zfi.payment.management.fragments.ViewSettingsDialog"
        }).then(function (oDialog) {
            that._oViewSettingsDialog = oDialog;
            that.getView().addDependent(oDialog);
            oDialog.open();
        });
    } else {
        this._oViewSettingsDialog.open();
    }
},

onFilterFieldChange: function () {
    const sKey         = this.byId("filterFieldSelect").getSelectedKey();
    const aDateFields  = ["postingDate", "baseDate"];
    const bIsDate      = aDateFields.indexOf(sKey) > -1;

    const oInput       = this.byId("filterValueInput");
    const oDatePicker  = this.byId("filterDatePicker");
    const oOperator    = this.byId("filterOperatorSelect");

    // ── Reset data whenever field changes ─────────────────────────────────
    const oModel = this.getView().getModel("openItems");
    if (this._aOriginalOpenItems) {
        oModel.setProperty("/openItems", this._aOriginalOpenItems);
        this._aOriginalOpenItems = null;
    }
    const oBinding = this.byId("openItemsTable").getBinding("items");
    oBinding.filter([]);

    // Show date picker or text input depending on field
    oInput.setVisible(!bIsDate);
    oDatePicker.setVisible(bIsDate);

    // For date fields force EQ operator and disable operator select
    if (bIsDate) {
        oOperator.setSelectedKey("EQ");
        oOperator.setEnabled(false);
    } else {
        oOperator.setEnabled(true);
    }

    // Clear values on field switch
    oInput.setValue("");
    oDatePicker.setDateValue(null);
},

onViewSettingsConfirm: function () {
    const oTable   = this.byId("openItemsTable");
    const oBinding = oTable.getBinding("items");
    const oModel   = this.getView().getModel("openItems");

    // ── Always restore original items before applying new filter ──────────
    if (this._aOriginalOpenItems) {
        oModel.setProperty("/openItems", this._aOriginalOpenItems);
        this._aOriginalOpenItems = null;
    }

    // ── Sort ──────────────────────────────────────────────────────────────
    const sSortField = this.byId("sortFieldSelect").getSelectedKey();
    const bDesc      = this.byId("sortOrderBtn").getSelectedKey() === "desc";
    const aSorters   = sSortField
        ? [new sap.ui.model.Sorter(sSortField, bDesc)]
        : [];

    // ── Filter ────────────────────────────────────────────────────────────
    const sFilterField    = this.byId("filterFieldSelect").getSelectedKey();
    const sFilterOperator = this.byId("filterOperatorSelect").getSelectedKey();
    const aDateFields     = ["postingDate", "baseDate"];
    const bIsDate         = aDateFields.indexOf(sFilterField) > -1;

    let aFilters = [];

    if (sFilterField) {
        if (bIsDate) {
            const oSelectedDate = this.byId("filterDatePicker").getDateValue();

            if (oSelectedDate) {
                // Always read from current full model data
                const aAllItems = oModel.getProperty("/openItems");

                const aFiltered = aAllItems.filter(function (oItem) {
                    const oValue = oItem[sFilterField];
                    if (!oValue) { return false; }

                    let oDate = null;
                    if (oValue instanceof Date) {
                        oDate = oValue;
                    } else if (typeof oValue === "string" && oValue.indexOf("/Date(") === 0) {
                        const ts = oValue.replace("/Date(", "").replace(")/", "").split("+")[0];
                        oDate = new Date(parseInt(ts));
                    } else if (typeof oValue === "string") {
                        oDate = new Date(oValue);
                    }

                    if (!oDate || isNaN(oDate.getTime())) { return false; }

                    return oDate.getUTCDate()     === oSelectedDate.getDate()
                        && oDate.getUTCMonth()    === oSelectedDate.getMonth()
                        && oDate.getUTCFullYear() === oSelectedDate.getFullYear();
                });

                // Store original before replacing
                this._aOriginalOpenItems = aAllItems;
                oModel.setProperty("/openItems", aFiltered);

                oBinding.sort(aSorters);
                this._oViewSettingsDialog.close();
                return;
            }
        } else {
            const sFilterValue = this.byId("filterValueInput").getValue().trim();
            if (sFilterValue) {
                const oOperator = sap.ui.model.FilterOperator[sFilterOperator];
                aFilters.push(new sap.ui.model.Filter(sFilterField, oOperator, sFilterValue));
            }
        }
    }

    oBinding.sort(aSorters);
    oBinding.filter(aFilters);
    this._oViewSettingsDialog.close();
},

onViewSettingsReset: function () {
    const oModel = this.getView().getModel("openItems");

    // Restore original items if date filter was applied
    if (this._aOriginalOpenItems) {
        oModel.setProperty("/openItems", this._aOriginalOpenItems);
        this._aOriginalOpenItems = null;
    }

    // Reset sort controls
    this.byId("sortFieldSelect").setSelectedKey("");
    this.byId("sortOrderBtn").setSelectedKey("asc");

    // Reset filter controls
    this.byId("filterFieldSelect").setSelectedKey("");
    this.byId("filterOperatorSelect").setSelectedKey("Contains");
    this.byId("filterOperatorSelect").setEnabled(true);
    this.byId("filterValueInput").setValue("");
    this.byId("filterValueInput").setVisible(true);
    this.byId("filterDatePicker").setDateValue(null);
    this.byId("filterDatePicker").setVisible(false);

    // Clear binding sort and filter
    const oBinding = this.byId("openItemsTable").getBinding("items");
    oBinding.sort([]);
    oBinding.filter([]);

    this._oViewSettingsDialog.close();
},

onViewSettingsCancel: function () {
    this._oViewSettingsDialog.close();
},

onViewSettingsCancel: function () {
    this._oViewSettingsDialog.close();
},

onSearchOpenItems: function (oEvt) {
    const sQuery   = oEvt.getSource().getValue().trim();
    const oModel   = this.getView().getModel("openItems");
    const oBinding = this.byId("openItemsTable").getBinding("items");

    // Always restore original before searching
    if (this._aOriginalOpenItems) {
        oModel.setProperty("/openItems", this._aOriginalOpenItems);
        this._aOriginalOpenItems = null;
    }
    oBinding.filter([]);

    if (!sQuery) {
        return;
    }

    const aAllItems = oModel.getProperty("/openItems");

    const aFiltered = aAllItems.filter(function (oItem) {
        const sQuery_lower = sQuery.toLowerCase();

        // Check all string/number fields
        return (oItem.docNo      && String(oItem.docNo).toLowerCase().indexOf(sQuery_lower)      > -1)
            || (oItem.yearF      && String(oItem.yearF).toLowerCase().indexOf(sQuery_lower)      > -1)
            || (oItem.lineItem   && String(oItem.lineItem).toLowerCase().indexOf(sQuery_lower)   > -1)
            || (oItem.compCode   && String(oItem.compCode).toLowerCase().indexOf(sQuery_lower)   > -1)
            || (oItem.vendorCode && String(oItem.vendorCode).toLowerCase().indexOf(sQuery_lower) > -1)
            || (oItem.docType    && String(oItem.docType).toLowerCase().indexOf(sQuery_lower)    > -1)
            || (oItem.extRef     && String(oItem.extRef).toLowerCase().indexOf(sQuery_lower)     > -1)
            || (oItem.assignNo   && String(oItem.assignNo).toLowerCase().indexOf(sQuery_lower)   > -1)
            || (oItem.spGl       && String(oItem.spGl).toLowerCase().indexOf(sQuery_lower)       > -1)
            || (oItem.debCredInd && String(oItem.debCredInd).toLowerCase().indexOf(sQuery_lower) > -1)
            || (oItem.postKey    && String(oItem.postKey).toLowerCase().indexOf(sQuery_lower)    > -1)
            || (oItem.amntLC     && String(oItem.amntLC).toLowerCase().indexOf(sQuery_lower)     > -1)
            || (oItem.amntDC     && String(oItem.amntDC).toLowerCase().indexOf(sQuery_lower)     > -1)
            || (function () {
                // Check postingDate
                if (!oItem.postingDate) { return false; }
                let oDate = oItem.postingDate instanceof Date
                    ? oItem.postingDate
                    : new Date(oItem.postingDate);
                if (isNaN(oDate.getTime())) { return false; }
                const sDay   = String(oDate.getUTCDate()).padStart(2, "0");
                const sMonth = String(oDate.getUTCMonth() + 1).padStart(2, "0");
                const sYear  = oDate.getUTCFullYear();
                const sFormatted = sMonth + "/" + sDay + "/" + sYear;
                return sFormatted.indexOf(sQuery) > -1;
            })()
            || (function () {
                // Check baseDate
                if (!oItem.baseDate) { return false; }
                let oDate = oItem.baseDate instanceof Date
                    ? oItem.baseDate
                    : new Date(oItem.baseDate);
                if (isNaN(oDate.getTime())) { return false; }
                const sDay   = String(oDate.getUTCDate()).padStart(2, "0");
                const sMonth = String(oDate.getUTCMonth() + 1).padStart(2, "0");
                const sYear  = oDate.getUTCFullYear();
                const sFormatted = sMonth + "/" + sDay + "/" + sYear;
                return sFormatted.indexOf(sQuery) > -1;
            })();
    });

    this._aOriginalOpenItems = aAllItems;
    oModel.setProperty("/openItems", aFiltered);
},


_resetPage: function () {
    // Clear JSON model
    const oModel = this.getView().getModel("openItems");
    oModel.setData({
        openItems: [],
        itemsToBeCleared: []
    });

    // Clear form fields
    const aInputIds = [
        "draftidInput", "companyCodeInput", "fiscalYearInput",
        "referenceInput", "_IDGenInput", "houseBankInput",
        "houseBankAccountInput", "glAccountInput", "supplierAccountInput",
        "currencyInput", "_IDGenInput3", "_IDGenInput1", "_IDGenInput2"
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

    // Clear date pickers
    const oDocPicker  = this.byId("documentDatePicker");
    const oPostPicker = this.byId("postingDatePicker");
    if (oDocPicker)  { oDocPicker.setValue("");  }
    if (oPostPicker) { oPostPicker.setValue(""); }

    // Reset display mode flags before applying
    this._bDisplayMode = false;
    this._applyDisplayMode("");

    // Reset Save button text
    this._updateSaveButton("create");
    this._updateTableTitles();
},


_updateSaveButton: function (sMode) {
    const sDraftSt = this.getView().getModel("pageModel").getProperty("/draftSt");
    if (sDraftSt === "2" || sDraftSt === "3") {
        return; // In Approval or Approved — _applyDisplayMode handles buttons
    }
    const oSaveButton = this.byId("_IDGenButton25");
    const oUpdateButton = this.byId("_IDGenButton27");
    if (oSaveButton) {
        if (sMode === "edit") {
            oSaveButton.setVisible(false);
            oUpdateButton.setVisible(true);
            // _IDGenButton27
            // oSaveButton.setText("Update");
            // oSaveButton.attachPress(this.onUpdate.bind(this));
            // oSaveButton.detachPress(this.onSave.bind(this));
        } else {
            oSaveButton.setVisible(true);
            oUpdateButton.setVisible(false);
            // oSaveButton.setText("Save");
            // oSaveButton.attachPress(this.onSave.bind(this));
            // oSaveButton.detachPress(this.onUpdate.bind(this));
        }
    }
},

_loadDraft: function (sDraftId) {
    const oDataModel = this.getOwnerComponent().getModel();
    const that = this;

    this.getView().setBusy(true);

    oDataModel.read("/head(guid'" + sDraftId + "')", {
        urlParameters: { "$expand": "to_item" },
        success: function (oHead) {
            debugger;
            that.getView().setBusy(false);

            // Populate form fields
            that._populateFormFields(oHead);

            const sVendor  = oHead.vendor;
            const aToItems = oHead.to_item && oHead.to_item.results
                ? oHead.to_item.results
                : [];

            // Map to_item → itemsToBeCleared using UI field names
            const aItemsToBeCleared = aToItems.map(function (oItem) {
                return that._mapItemToUIFormat(oItem);
            });

            // Load open items and exclude already-cleared ones
            that._loadOpenItemsExcluding(sVendor, aItemsToBeCleared, aToItems);

            // Switch button to Update
            that._updateSaveButton("edit");
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

    // OData model already parsed it into a JS Date object
    if (value instanceof Date) {
        oDate = value;

    // /Date(timestamp)/ or /Date(timestamp+offset)/ format
    } else if (typeof value === "string" && value.indexOf("/Date(") === 0) {
        const sTimestamp = value.replace("/Date(", "").replace(")/", "").split("+")[0];
        oDate = new Date(parseInt(sTimestamp));

    // ISO string: "2025-03-27T00:00:00"
    } else if (typeof value === "string" && value.indexOf("T") > -1) {
        oDate = new Date(value);

    // Plain date string: "2025-03-27"
    } else if (typeof value === "string" && value.indexOf("-") > -1) {
        const aParts = value.split("-");
        oDate = new Date(
            parseInt(aParts[0]),
            parseInt(aParts[1]) - 1,
            parseInt(aParts[2])
        );
    }

    if (oDate && !isNaN(oDate.getTime())) {
        oCtrl.setDateValue(oDate);
    } else {
        console.warn("Could not parse date for [" + sId + "], raw value:", value, "type:", typeof value);
    }
}.bind(this);

    fnSet("draftidInput",         oHead.draftId);
    fnSet("companyCodeInput",     oHead.compCode);
    fnSet("fiscalYearInput",      oHead.fiscYear);
    fnSet("referenceInput",       oHead.reference);
    fnSet("_IDGenInput",          oHead.headText);
    fnSet("houseBankInput",       oHead.bankKey);
    fnSet("houseBankAccountInput",     oHead.bankAcc);
    fnSet("supplierAccountInput", oHead.vendor);
    
    fnSet("glAccountInput", oHead.bankGL);
    fnSet("_IDGenInput3",         oHead.payAmnt);

    fnSetDate("documentDatePicker", oHead.docDate);
    fnSetDate("postingDatePicker",  oHead.postingDate);
    fnSet("currencyInput",  oHead.curr);

    this.getView().getModel("pageModel").setProperty("/draftSt", oHead.draftSt || "");
    this._applyDisplayMode(oHead.draftSt);
},

_applyDisplayMode: function (sDraftSt) {
    const bIsInApproval = sDraftSt === "2"; // In Approval — full display mode
    const bIsCreated    = sDraftSt === "1"; // Created — some fields locked
    const bIsApproved   = sDraftSt === "3"; // Approved — display mode + Post button
    const bIsRejected   = sDraftSt === "4"; // Rejected — editable + Update + Resubmit

    // ── Toggle form visibility ─────────────────────────────────────────────
    const oEditFormBox    = this.byId("editFormBox");
    const oDisplayFormBox = this.byId("displayFormBox");
    if (oEditFormBox)    { oEditFormBox.setVisible(!bIsInApproval && !bIsApproved); }
    if (oDisplayFormBox) { oDisplayFormBox.setVisible(bIsInApproval || bIsApproved); }

    // ── Populate pageModel for display fragment ────────────────────────────
    if (bIsInApproval || bIsApproved) {
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
            const sDay   = String(oDate.getDate()).padStart(2, "0");
            const sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
            const sYear  = oDate.getFullYear();
            return sDay + "/" + sMonth + "/" + sYear;
        }.bind(this);

        oPageModel.setProperty("/compCode",    fnGet("companyCodeInput"));
        oPageModel.setProperty("/fiscYear",    fnGet("fiscalYearInput"));
        oPageModel.setProperty("/reference",   fnGet("referenceInput"));
        oPageModel.setProperty("/headText",    fnGet("_IDGenInput"));
        oPageModel.setProperty("/bankKey",     fnGet("houseBankInput"));
        oPageModel.setProperty("/bankAcc",     fnGet("houseBankAccountInput"));
        oPageModel.setProperty("/bankGL",      fnGet("glAccountInput"));
        oPageModel.setProperty("/vendor",      fnGet("supplierAccountInput"));
        oPageModel.setProperty("/curr",        fnGet("currencyInput"));
        oPageModel.setProperty("/payAmnt",     fnGet("_IDGenInput3"));
        oPageModel.setProperty("/invoiceSum",  fnGet("_IDGenInput1"));
        oPageModel.setProperty("/balance",     fnGet("_IDGenInput2"));
        oPageModel.setProperty("/docDate",     fnGetDate("documentDatePicker"));
        oPageModel.setProperty("/postingDate", fnGetDate("postingDatePicker"));
    }

    // ── Fields always locked (vendor, company code, bank fields) ──────────
    const aAlwaysLockedIds = [
        "supplierAccountInput", "companyCodeInput", "houseBankInput",
        "houseBankAccountInput", "glAccountInput"
    ];

    // ── Fields editable in Created and Rejected modes ─────────────────────
    const aEditableIds = [
        "fiscalYearInput", "referenceInput", "_IDGenInput",
        "currencyInput", "_IDGenInput3",
        "documentDatePicker", "postingDatePicker"
    ];

    if (bIsInApproval || bIsApproved) {
        // Display fragment handles — nothing to do for inputs
    } else if (bIsCreated || bIsRejected) {
        // Lock vendor/bank fields, keep rest editable
        aAlwaysLockedIds.forEach(function (sId) {
            const oCtrl = this.byId(sId);
            if (oCtrl) { oCtrl.setEditable(false); }
        }.bind(this));

        aEditableIds.forEach(function (sId) {
            const oCtrl = this.byId(sId);
            if (oCtrl) { oCtrl.setEditable(true); }
        }.bind(this));
    } else {
        // Create mode — all fields editable
        aAlwaysLockedIds.concat(aEditableIds).forEach(function (sId) {
            const oCtrl = this.byId(sId);
            if (oCtrl) { oCtrl.setEditable(true); }
        }.bind(this));
    }

    // ── Button visibility and text ────────────────────────────────────────
    const oSaveButton   = this.byId("_IDGenButton25");
    const oUpdateButton   = this.byId("_IDGenButton27");
    const oSubmitButton = this.byId("_IDGenButton26");

    const oPostButton   = this.byId("_IDGenButton2622");
    const oResubmitButton   = this.byId("resubmitButton");
    
    const openItemForm   = this.byId("openItemsForm");
    if (bIsInApproval) {
        // Hide all buttons
        if (oSaveButton)   { oSaveButton.setVisible(false);              }
        if (oSubmitButton) { oSubmitButton.setVisible(false);             }
        if (oPostButton)   { oPostButton.setVisible(false);               }
        if (oUpdateButton)   { oUpdateButton.setVisible(false);               }
        if (openItemForm)   { openItemForm.setVisible(false);               }

    } else if (bIsApproved) {
        // Show Post only
        if (oSaveButton)   { oSaveButton.setVisible(false);              }
        if (oSubmitButton) { oSubmitButton.setVisible(false);             }
        if (oPostButton)   { oPostButton.setVisible(true);                }
        if (oUpdateButton)   { oUpdateButton.setVisible(false);               }
        if (openItemForm)   { openItemForm.setVisible(false);               }

    } else if (bIsCreated) {
        // Show Update and Submit, hide Post
        if (oSaveButton)   { oSaveButton.setVisible(false);               }
        if (oSubmitButton) { oSubmitButton.setVisible(true);  oSubmitButton.setText("Submit");    }
        if (oPostButton)   { oPostButton.setVisible(false);               }
        if (oUpdateButton)   { oUpdateButton.setVisible(true);               }
        if (openItemForm)   { openItemForm.setVisible(true);               }
    } else if (bIsRejected) {
        // Show Update and Resubmit, hide Save and Post
        if (oSaveButton)   { oSaveButton.setVisible(false);               }
        if (oSubmitButton) { oSubmitButton.setVisible(false); }
        if (oPostButton)   { oPostButton.setVisible(false);               }
        if (oUpdateButton)   { oUpdateButton.setVisible(false);               }
        if (oResubmitButton)   { oResubmitButton.setVisible(true);               }
        
        if (openItemForm)   { openItemForm.setVisible(true);               }
    } else {
        // Create mode — show Save and Submit, hide Post
        if (oSaveButton)   { oSaveButton.setVisible(true);               }
        if (oSubmitButton) { oSubmitButton.setVisible(true); }
        if (oPostButton)   { oPostButton.setVisible(false);               }
        if (oUpdateButton)   { oUpdateButton.setVisible(false);               }
        if (oResubmitButton)   { oResubmitButton.setVisible(false);               }
        
        if (openItemForm)   { openItemForm.setVisible(true);               }
    }

    // ── Store display mode flag for handleStateChange ─────────────────────
    this._bDisplayMode = bIsInApproval || bIsApproved;

    // ── Clear column in open items table ──────────────────────────────────
    const oClearColumn = this.byId("clearColumn");
    if (oClearColumn) { oClearColumn.setVisible(!this._bDisplayMode); }

    // ── Remove column in items to be cleared table ────────────────────────
    const oRemoveColumn = this.byId("_IDGenColumn19");
    if (oRemoveColumn) { oRemoveColumn.setVisible(!this._bDisplayMode); }

    // ── Hide/show Remove buttons in already-rendered rows ─────────────────
    const oItemsToClearTable = this.byId("itemsToClearTable");
    if (oItemsToClearTable) {
        oItemsToClearTable.getItems().forEach(function (oItem) {
            const aCells = oItem.getCells();
            if (aCells && aCells[0]) {
                aCells[0].setVisible(!this._bDisplayMode);
            }
        }.bind(this));
    }
},

_mapItemToUIFormat: function (oItem) {
    // Maps to_item backend fields → UI openItems field names
    return {
        docNo:       oItem.refDoc,
        yearF:       oItem.refYear,
        lineItem:    oItem.refLine,
        compCode:    oItem.compCode    || "",
        amntLC:      oItem.amntLC      || "0.000",
        amntDC:      oItem.amntDC      || "0.000",
        docType:     oItem.docType     || "",
        baseDate:    oItem.baseDate    || null,
        postingDate: oItem.postingDate || null,
        extRef:      oItem.extRef      || "",
        assignNo:    oItem.assignNo    || "",
        spGl:        oItem.spGl        || "",
        debCredInd:  oItem.debCredInd  || "",
        postKey:     oItem.postKey     || "",
        vendorCode:  oItem.vendorCode  || "",
        docCurr:  oItem.docCurr  || "",
        compCurr:  oItem.compCurr  || ""
    };
},

_loadOpenItemsExcluding: function (sVendor, aItemsToBeCleared, aOriginalToItems) {
    const oDataModel = this.getOwnerComponent().getModel();
    const oJSONModel = this.getView().getModel("openItems");
    const that = this;

    const oTable = this.byId("openItemsTable");
    if (oTable) { oTable.setBusy(true); }

    const aFilters = [new Filter("vendorCode", FilterOperator.EQ, sVendor)];

    oDataModel.read("/openItems", {
        filters: aFilters,
        success: function (oData) {
            if (oTable) { oTable.setBusy(false); }

            const aAllOpenItems = oData.results || [];

            // Build lookup Set: refDoc|refYear|refLine
            const oClearedSet = new Set(
                aOriginalToItems.map(function (oItem) {
                    return oItem.refDoc + "|" + oItem.refYear + "|" + oItem.refLine;
                })
            );

            // Exclude items already cleared
            const aFilteredOpenItems = aAllOpenItems.filter(function (oItem) {
                const sKey = oItem.docNo + "|" + oItem.yearF + "|" + oItem.lineItem;
                return !oClearedSet.has(sKey);
            });

            oJSONModel.setData({
                openItems: aFilteredOpenItems,
                itemsToBeCleared: aItemsToBeCleared
            });

            that._updateTableTitles();
            MessageToast.show(
                "Loaded " + aFilteredOpenItems.length + " open items, " +
                aItemsToBeCleared.length + " items to be cleared"
            );
        },
        error: function () {
            if (oTable) { oTable.setBusy(false); }
            MessageBox.error("Failed to load open items for vendor: " + sVendor);
        }
    });
},
onVendorSubmit: function(oEvt) {
    const sVendor = oEvt.getSource().getValue().trim();

    if (!sVendor) {
        const oModel = this.getView().getModel("openItems");
        oModel.setData({ openItems: [], itemsToBeCleared: [] });
        this._updateTableTitles();
        return;
    }

    this._loadOpenItems(sVendor);
},

_loadOpenItems: function(sVendor) {
    const oDataModel = this.getOwnerComponent().getModel();
    const that = this;

    const oTable = this.byId("openItemsTable");
    if (oTable) { oTable.setBusy(true); }

    const aFilters = sVendor 
        ? [new Filter("vendorCode", FilterOperator.EQ, sVendor)] 
        : [];

    oDataModel.read("/openItems", {
        filters: aFilters,
        success: function(oData) {
            const oJSONModel = that.getView().getModel("openItems");
            const aResults = oData && oData.results ? oData.results : [];

            oJSONModel.setData({
                openItems: aResults,
                itemsToBeCleared: []  // reset cleared list on each new vendor load
            });

            that._updateTableTitles();
            MessageToast.show("Loaded " + aResults.length + " items");
            if (oTable) { oTable.setBusy(false); }
        },
        error: function(oError) {
            if (oTable) { oTable.setBusy(false); }
            let sErrorMessage = "Failed to load open items";
            if (oError && oError.responseText) {
                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error?.message?.value) {
                        sErrorMessage = oErrorResponse.error.message.value;
                    }
                } catch (e) {
                    sErrorMessage = oError.message || sErrorMessage;
                }
            }
            MessageBox.error(sErrorMessage);
        }
    });
},
// _updateTableTitles: function() {
//     const oModel = this.getView().getModel("openItems");
//     const iOpenItems = oModel.getProperty("/openItems").length;
//     const iItemsToBeCleared = oModel.getProperty("/itemsToBeCleared").length;
    
//     const oOpenItemsTitle = this.byId("_IDGenTitle2");
//     const oItemsToClearTitle = this.byId("_IDGenTitle3");
    
//     if (oOpenItemsTitle) {
//         oOpenItemsTitle.setText("Open Items (" + iOpenItems + ")");
//     }
//     if (oItemsToClearTitle) {
//         oItemsToClearTitle.setText("Items to Be Cleared (" + iItemsToBeCleared + ")");
//     }
// },
_updateTableTitles: function() {
    const oModel = this.getView().getModel("openItems");
    const aOpenItems = oModel.getProperty("/openItems");
    const aItemsToBeCleared = oModel.getProperty("/itemsToBeCleared");

    const iOpenItems = aOpenItems.length;
    const iItemsToBeCleared = aItemsToBeCleared.length;

    const oOpenItemsTitle = this.byId("_IDGenTitle2");
    const oItemsToClearTitle = this.byId("_IDGenTitle3");

    if (oOpenItemsTitle) {
        oOpenItemsTitle.setText("Open Items (" + iOpenItems + ")");
    }
    if (oItemsToClearTitle) {
        oItemsToClearTitle.setText("Items to Be Cleared (" + iItemsToBeCleared + ")");
    }

    // Calculate Total Invoice Sum from itemsToBeCleared amntLC
    const fTotalInvoiceSum = aItemsToBeCleared.reduce(function(fSum, oItem) {
        const fAmt = parseFloat(oItem.amntLC) || 0;
        return fSum + fAmt;
    }, 0);

    // Get Total Payment Amount from the fragment input
    const oPayAmntInput = this.byId("_IDGenInput3");
    const fPayAmnt = oPayAmntInput ? (parseFloat(oPayAmntInput.getValue()) || 0) : 0;

    // Calculate Balance
    const fBalance = fPayAmnt - fTotalInvoiceSum;

    // Update Invoice Sum field
    const oInvoiceSumInput = this.byId("_IDGenInput1");
    if (oInvoiceSumInput) {
        oInvoiceSumInput.setValue(fTotalInvoiceSum.toFixed(3));
    }

    // Update Balance field
    const oBalanceInput = this.byId("_IDGenInput2");
    if (oBalanceInput) {
        oBalanceInput.setValue(fBalance.toFixed(3));
        oBalanceInput.setValueState(
            Math.abs(fBalance) < 0.001
                ? sap.ui.core.ValueState.None
                : sap.ui.core.ValueState.Error
        );
        oBalanceInput.setValueStateText("Balance must be zero to save");
    }
},

 


onClearItem: function(oEvt) {
    const oButton = oEvt.getSource();
    const oContext = oButton.getBindingContext("openItems");

    if (!oContext) {
        return;
    }
    debugger;
    const oModel = this.getView().getModel("openItems");
    const sPath = oContext.getPath();
    const iIndex = parseInt(sPath.split("/").pop());

    const aOpenItems = JSON.parse(JSON.stringify(oModel.getProperty("/openItems")));
    const aItemsToBeCleared = JSON.parse(JSON.stringify(oModel.getProperty("/itemsToBeCleared")));

    if (iIndex < 0 || iIndex >= aOpenItems.length) {
        MessageToast.show("Invalid item index");
        return;
    }

    const oItem = aOpenItems.splice(iIndex, 1)[0];
    aItemsToBeCleared.push(oItem);

    oModel.setData({
        openItems: aOpenItems,
        itemsToBeCleared: aItemsToBeCleared
    });

    this._updateTableTitles();
    // this._rebindOpenItemsTable();

    MessageToast.show("Item moved to clearing: " + oItem.docNo);
},

// NEW METHOD - Move item back to "Open Items"
onRemoveItem: function(oEvt) {
    const oButton = oEvt.getSource();
    const oContext = oButton.getBindingContext("openItems");

    if (!oContext) {
        return;
    }

    const oModel = this.getView().getModel("openItems");
    const sPath = oContext.getPath();
    const iIndex = parseInt(sPath.split("/").pop());

    // Deep copy both arrays to avoid reference mutation issues
    const aItemsToBeCleared = JSON.parse(JSON.stringify(oModel.getProperty("/itemsToBeCleared")));
    const aOpenItems = JSON.parse(JSON.stringify(oModel.getProperty("/openItems")));

    // Guard against invalid index
    if (iIndex < 0 || iIndex >= aItemsToBeCleared.length) {
        MessageToast.show("Invalid item index");
        return;
    }

    // Cleanly splice out item and push to openItems
    const oItem = aItemsToBeCleared.splice(iIndex, 1)[0];
    aOpenItems.push(oItem);

    // Use setData to replace the entire model cleanly
    oModel.setData({
        openItems: aOpenItems,
        itemsToBeCleared: aItemsToBeCleared
    });

    // Explicitly refresh the p13n-bound table's item binding
    const oTable = this.byId("openItemsTable");
    const oBinding = oTable.getBinding("items");
    if (oBinding) {
        oBinding.refresh();
    }

    this._updateTableTitles();
    MessageToast.show("Item moved back to open items: " + oItem.docNo);
},
// ADD THESE FORMATTER METHODS
formatDate: function(value) {
    if (value) {
        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
            pattern: "MM/dd/yyyy"
        });
        return oDateFormat.format(new Date(value));
    }
    return "";
},

formatAmount: function(value) {
    if (value !== null && value !== undefined) {
        return parseFloat(value).toFixed(2);
    }
    return "";
},
onRefreshItems: function() {

       // Clear search field
    const oSearchField = this.byId("_IDGenSearchField");
    if (oSearchField) { oSearchField.setValue(""); }

    // Clear original items cache
    this._aOriginalOpenItems = null;

    const oVendorInput = this.byId("supplierAccountInput");
    const sVendor = oVendorInput ? oVendorInput.getValue().trim() : "";

    if (!sVendor) {
        MessageToast.show("Please enter a vendor first");
        return;
    }

    this._refreshOpenItemsOnly(sVendor);
    this.onViewSettingsReset();
},

        onNavBack: function() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteNewDoc");
        },


_refreshOpenItemsOnly: function (sVendor) {
    const oDataModel = this.getOwnerComponent().getModel();
    const oJSONModel = this.getView().getModel("openItems");
    const that       = this;

    const oTable = this.byId("openItemsTable");
    if (oTable) { oTable.setBusy(true); }

    const aFilters = [new Filter("vendorCode", FilterOperator.EQ, sVendor)];

    oDataModel.read("/openItems", {
        filters: aFilters,
        success: function (oData) {
            if (oTable) { oTable.setBusy(false); }

            const aAllOpenItems = oData.results || [];

            // Get current itemsToBeCleared — preserve them
            const aItemsToBeCleared = oJSONModel.getProperty("/itemsToBeCleared") || [];

            // Build lookup set from itemsToBeCleared to exclude them from open items
            const oClearedSet = new Set(
                aItemsToBeCleared.map(function (oItem) {
                    return oItem.docNo + "|" + oItem.yearF + "|" + oItem.lineItem;
                })
            );

            // Exclude already cleared items from fresh open items
            const aFilteredOpenItems = aAllOpenItems.filter(function (oItem) {
                const sKey = oItem.docNo + "|" + oItem.yearF + "|" + oItem.lineItem;
                return !oClearedSet.has(sKey);
            });

            // Only update openItems, keep itemsToBeCleared intact
            oJSONModel.setProperty("/openItems", aFilteredOpenItems);

            that._updateTableTitles();
            MessageToast.show("Refreshed " + aFilteredOpenItems.length + " open items");
        },
        error: function () {
            if (oTable) { oTable.setBusy(false); }
            MessageBox.error("Failed to refresh open items for vendor: " + sVendor);
        }
    });
},        

_setBusyDialog: function(bOpen) {
    if (bOpen) {
        if (!this._oBusyDialog) {
            this._oBusyDialog = new sap.m.BusyDialog({
                title: "Please Wait",
                text:  "Processing..."
            });
        }
        this._oBusyDialog.open();
    } else {
        if (this._oBusyDialog) {
            this._oBusyDialog.close();
        }
    }
},



onSave: function() {
    const that = this;

    // ── 1. Collect form field values ──────────────────────────────────────
    const sCompCode  = this.byId("companyCodeInput")     ? this.byId("companyCodeInput").getValue().trim()     : "";
    const sFiscYear  = this.byId("fiscalYearInput")      ? this.byId("fiscalYearInput").getValue().trim()      : "";
    const sReference = this.byId("referenceInput")       ? this.byId("referenceInput").getValue().trim()       : "";
    const sHeadText  = this.byId("_IDGenInput")          ? this.byId("_IDGenInput").getValue().trim()          : "";
    const sBankKey   = this.byId("houseBankInput")       ? this.byId("houseBankInput").getValue().trim()       : "";
    const sBankAcc   = this.byId("houseBankAccountInput") ? this.byId("houseBankAccountInput").getValue().trim() : "";
    const sVendor    = this.byId("supplierAccountInput") ? this.byId("supplierAccountInput").getValue().trim() : "";
    const sPayAmnt   = this.byId("_IDGenInput3")         ? this.byId("_IDGenInput3").getValue().trim()         : "0";

    const oDocDatePicker  = this.byId("documentDatePicker");
    const oPostDatePicker = this.byId("postingDatePicker");
    const oDocDate        = oDocDatePicker  ? oDocDatePicker.getDateValue()  : null;
    const oPostDate       = oPostDatePicker ? oPostDatePicker.getDateValue() : null;

    const sBankGL   = this.byId("glAccountInput")     ? this.byId("glAccountInput").getValue().trim()     : "";
    const sCurrency = this.byId("currencyInput")       ? this.byId("currencyInput").getValue().trim()       : "";

    // ── 2. Required field validation ──────────────────────────────────────
    if (!sCompCode || !sFiscYear || !sVendor || !sBankKey || !sBankAcc || !oDocDate || !oPostDate) {
        MessageBox.error("Please fill all required fields before saving.");
        return;
    }

    // ── 3. Balance validation ─────────────────────────────────────────────
    const oModel            = this.getView().getModel("openItems");
    const aItemsToBeCleared = oModel.getProperty("/itemsToBeCleared");

    if (aItemsToBeCleared.length === 0) {
        MessageBox.error("Please move at least one item to the 'Items to Be Cleared' table before saving.");
        return;
    }

    const fTotalInvoiceSum = aItemsToBeCleared.reduce(function(fSum, oItem) {
        return fSum + (parseFloat(oItem.amntLC) || 0);
    }, 0);

    const fPayAmnt = parseFloat(sPayAmnt) || 0;
    const fBalance = fPayAmnt - fTotalInvoiceSum;

    if (Math.abs(fBalance) >= 0.001) {
        MessageBox.error(
            "Balance must be zero before saving.\n" +
            "Total Payment Amount: " + fPayAmnt.toFixed(3) + "\n" +
            "Total Invoice Sum:    " + fTotalInvoiceSum.toFixed(3) + "\n" +
            "Balance:              " + fBalance.toFixed(3)
        );
        return;
    }

    // ── 4. Date conversion helper ─────────────────────────────────────────
    function toODataDate(value) {
        if (!value) { return null; }
        if (value instanceof Date) {
            return "/Date(" + value.getTime() + ")/";
        }
        if (typeof value === "string" && value.indexOf("/Date(") === 0) {
            return value;
        }
        if (typeof value === "string" && value.indexOf("T") > -1) {
            const oDate = new Date(value);
            if (!isNaN(oDate.getTime())) {
                return "/Date(" + oDate.getTime() + ")/";
            }
        }
        if (typeof value === "string" && value.indexOf("/") > -1 && value.length === 10) {
            const aParts = value.split("/");
            const oDate = new Date(
                parseInt(aParts[2]),
                parseInt(aParts[0]) - 1,
                parseInt(aParts[1])
            );
            if (!isNaN(oDate.getTime())) {
                return "/Date(" + oDate.getTime() + ")/";
            }
        }
        return null;
    }

    // ── 5. Build to_item deep entity array ────────────────────────────────
    const aToItems = aItemsToBeCleared.map(function(oItem, iIndex) {
        const sItemId = String(iIndex + 1).padStart(3, "0");
        return {
            itemId:      sItemId,
            itemTy:      "1",
            amntLC:      oItem.amntLC      || "0.000",
            amntDC:      oItem.amntDC      || "0.000",
            compCode:    oItem.compCode    || sCompCode,
            refDoc:      oItem.docNo,
            refYear:     oItem.yearF,
            refLine:     oItem.lineItem,
            docType:     oItem.docType     || "",
            baseDate:    toODataDate(oItem.baseDate),
            extRef:      oItem.extRef      || "",
            assignNo:    oItem.assignNo    || "",
            spGl:        oItem.spGl        || "",
            debCredInd:  oItem.debCredInd  || "",
            postKey:     oItem.postKey     || "",
            docCurr:     oItem.docCurr     || "",
            compCurr:     oItem.compCurr     || "",
            postingDate: toODataDate(oItem.postingDate)
        };
    });

    // ── 6. Build head payload ─────────────────────────────────────────────
const oPayload = {
    compCode:    sCompCode,
    fiscYear:    sFiscYear,
    draftType:   "1",
    docDate:     toODataDate(oDocDate),
    postingDate: toODataDate(oPostDate),
    reference:   sReference,
    headText:    sHeadText,
    bankKey:     sBankKey,
    bankAcc:     sBankAcc,
    bankGL:      sBankGL,
    vendor:      sVendor,
    curr:        sCurrency,
    payAmnt:     parseFloat(sPayAmnt).toFixed(3),
    action:      "I",
    to_item:     aToItems
};

    // ── 7. POST to backend ────────────────────────────────────────────────
    const oDataModel = this.getOwnerComponent().getModel();
    delete oPayload.draftId;

    oDataModel.setUseBatch(false);
    this._setBusyDialog(true);
    oDataModel.create("/head", oPayload, {
        success: function(oCreatedData) {
            that._setBusyDialog(false);
            const sDraftId = oCreatedData.draftId;

            const oDraftIdInput = that.byId("draftidInput");
            if (oDraftIdInput && sDraftId) {
                oDraftIdInput.setValue(sDraftId);
            }

            that.getView().getModel("pageModel").setData({
                mode: "edit",
                draftId: sDraftId
            });
            that._updateSaveButton("edit");

            oDataModel.setUseBatch(true);

            MessageToast.show("Saved successfully. Draft ID: " + sDraftId);
        },
        error: function(oError) {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);

            let sErrorMessage = "Failed to save payment";
            if (oError && oError.responseText) {
                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message && oErrorResponse.error.message.value) {
                        sErrorMessage = oErrorResponse.error.message.value;
                    }
                } catch (e) {
                    sErrorMessage = oError.message || sErrorMessage;
                }
            }
            MessageBox.error(sErrorMessage);
        }
    });
},

onUpdate: function() {
    const that = this;
    const oPageModel    = this.getView().getModel("pageModel");
    const sSavedDraftId = oPageModel.getProperty("/draftId");

    // ── 1. Collect form field values ──────────────────────────────────────
    const sCompCode  = this.byId("companyCodeInput")     ? this.byId("companyCodeInput").getValue().trim()     : "";
    const sFiscYear  = this.byId("fiscalYearInput")      ? this.byId("fiscalYearInput").getValue().trim()      : "";
    const sReference = this.byId("referenceInput")       ? this.byId("referenceInput").getValue().trim()       : "";
    const sHeadText  = this.byId("_IDGenInput")          ? this.byId("_IDGenInput").getValue().trim()          : "";
    const sBankKey   = this.byId("houseBankInput")       ? this.byId("houseBankInput").getValue().trim()       : "";
    const sBankAcc   = this.byId("houseBankAccountInput") ? this.byId("houseBankAccountInput").getValue().trim() : "";
    const sVendor    = this.byId("supplierAccountInput") ? this.byId("supplierAccountInput").getValue().trim() : "";
    const sPayAmnt   = this.byId("_IDGenInput3")         ? this.byId("_IDGenInput3").getValue().trim()         : "0";

    const oDocDatePicker  = this.byId("documentDatePicker");
    const oPostDatePicker = this.byId("postingDatePicker");
    const oDocDate        = oDocDatePicker  ? oDocDatePicker.getDateValue()  : null;
    const oPostDate       = oPostDatePicker ? oPostDatePicker.getDateValue() : null;

    const sBankGL   = this.byId("glAccountInput")     ? this.byId("glAccountInput").getValue().trim()     : "";
    const sCurrency = this.byId("currencyInput")       ? this.byId("currencyInput").getValue().trim()       : "";

    // ── 2. Required field validation ──────────────────────────────────────
    if (!sCompCode || !sFiscYear || !sVendor || !sBankKey || !sBankAcc || !oDocDate || !oPostDate) {
        MessageBox.error("Please fill all required fields before updating.");
        return;
    }

    // ── 3. Balance validation ─────────────────────────────────────────────
    const oModel            = this.getView().getModel("openItems");
    const aItemsToBeCleared = oModel.getProperty("/itemsToBeCleared");

    if (aItemsToBeCleared.length === 0) {
        MessageBox.error("Please move at least one item to the 'Items to Be Cleared' table before updating.");
        return;
    }

    const fTotalInvoiceSum = aItemsToBeCleared.reduce(function(fSum, oItem) {
        return fSum + (parseFloat(oItem.amntLC) || 0);
    }, 0);

    const fPayAmnt = parseFloat(sPayAmnt) || 0;
    const fBalance = fPayAmnt - fTotalInvoiceSum;

    if (Math.abs(fBalance) >= 0.001) {
        MessageBox.error(
            "Balance must be zero before updating.\n" +
            "Total Payment Amount: " + fPayAmnt.toFixed(3) + "\n" +
            "Total Invoice Sum:    " + fTotalInvoiceSum.toFixed(3) + "\n" +
            "Balance:              " + fBalance.toFixed(3)
        );
        return;
    }

    // ── 4. Date conversion helper ─────────────────────────────────────────
    function toODataDate(value) {
        if (!value) { return null; }
        if (value instanceof Date) {
            return "/Date(" + value.getTime() + ")/";
        }
        if (typeof value === "string" && value.indexOf("/Date(") === 0) {
            return value;
        }
        if (typeof value === "string" && value.indexOf("T") > -1) {
            const oDate = new Date(value);
            if (!isNaN(oDate.getTime())) {
                return "/Date(" + oDate.getTime() + ")/";
            }
        }
        if (typeof value === "string" && value.indexOf("/") > -1 && value.length === 10) {
            const aParts = value.split("/");
            const oDate = new Date(
                parseInt(aParts[2]),
                parseInt(aParts[0]) - 1,
                parseInt(aParts[1])
            );
            if (!isNaN(oDate.getTime())) {
                return "/Date(" + oDate.getTime() + ")/";
            }
        }
        return null;
    }

    // ── 5. Build to_item deep entity array ────────────────────────────────
    const aToItems = aItemsToBeCleared.map(function(oItem, iIndex) {
        const sItemId = String(iIndex + 1).padStart(3, "0");
        return {
            itemId:      sItemId,
            itemTy:      "1",
            amntLC:      oItem.amntLC      || "0.000",
            amntDC:      oItem.amntDC      || "0.000",
            compCode:    oItem.compCode    || sCompCode,
            refDoc:      oItem.docNo,
            refYear:     oItem.yearF,
            refLine:     oItem.lineItem,
            docType:     oItem.docType     || "",
            baseDate:    toODataDate(oItem.baseDate),
            extRef:      oItem.extRef      || "",
            assignNo:    oItem.assignNo    || "",
            spGl:        oItem.spGl        || "",
            debCredInd:  oItem.debCredInd  || "",
            postKey:     oItem.postKey     || "",
            docCurr :  oItem.docCurr  || "",
            compCurr:     oItem.compCurr     || "",
            postingDate: toODataDate(oItem.postingDate)
        };
    });

    // ── 6. Build head payload ─────────────────────────────────────────────
        const oPayload = {
            draftId:     sSavedDraftId,
            compCode:    sCompCode,
            fiscYear:    sFiscYear,
            draftType:   "1",
            docDate:     toODataDate(oDocDate),
            postingDate: toODataDate(oPostDate),
            reference:   sReference,
            headText:    sHeadText,
            bankKey:     sBankKey,
            bankAcc:     sBankAcc,
            bankGL:      sBankGL,
            vendor:      sVendor,
            curr:        sCurrency,
            payAmnt:     parseFloat(sPayAmnt).toFixed(3),
            action:      "U",
            to_item:     aToItems
        };

    // ── 7. POST to backend (Action "U" tells backend to update) ───────────
    const oDataModel = this.getOwnerComponent().getModel();

    oDataModel.setUseBatch(false);
    this._setBusyDialog(true);
    oDataModel.create("/head", oPayload, {
        success: function(oUpdatedData) {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);

            MessageToast.show("Updated successfully. Draft ID: " + sSavedDraftId);
        },
        error: function(oError) {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);

            let sErrorMessage = "Failed to update payment";
            if (oError && oError.responseText) {
                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message && oErrorResponse.error.message.value) {
                        sErrorMessage = oErrorResponse.error.message.value;
                    }
                } catch (e) {
                    sErrorMessage = oError.message || sErrorMessage;
                }
            }
            MessageBox.error(sErrorMessage);
        }
    });
},

 
onPayAmountChange: function() {
    // Reuse existing logic — just recalculate titles/sum/balance
    this._updateTableTitles();
},

onSubmit: function() {
    const that = this;
    const oPageModel    = this.getView().getModel("pageModel");
    const sMode         = oPageModel.getProperty("/mode");
    const sSavedDraftId = oPageModel.getProperty("/draftId");
    const oDataModel    = this.getOwnerComponent().getModel();

const fnSubmit = function(sDraftId) {
    oDataModel.setUseBatch(false);
    that._setBusyDialog(true);
    oDataModel.create("/head", { draftId: sDraftId, action: "S" }, {
        success: function() {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);
            MessageBox.success("Payment submitted successfully. Draft ID: " + sDraftId, {
                onClose: function() {
                    const oRouter = that.getOwnerComponent().getRouter();
                    oRouter.navTo("RouteNewDoc");
                }
            });
        },
        error: function(oError) {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);
            let sErrorMessage = "Failed to submit payment";
            if (oError && oError.responseText) {
                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message && oErrorResponse.error.message.value) {
                        sErrorMessage = oErrorResponse.error.message.value;
                    }
                } catch (e) {
                    sErrorMessage = oError.message || sErrorMessage;
                }
            }
            MessageBox.error(sErrorMessage);
        }
    });
};

    if (sMode === "edit") {
        // Already has draftId — update first then submit
        that.onUpdate();
        fnSubmit(sSavedDraftId);
    } else {
        // No draftId yet — save first then submit
        that.onSave();
        // After onSave succeeds it switches pageModel to edit mode and sets draftId
        // We poll pageModel to get the draftId once onSave completes
        const iMaxAttempts = 20;
        let iAttempts = 0;
        const oInterval = setInterval(function() {
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
onPost: function () {
    const that = this;
    const oPageModel    = this.getView().getModel("pageModel");
    const sDraftId      = oPageModel.getProperty("/draftId");
    const oDataModel    = this.getOwnerComponent().getModel();

    if (!sDraftId) {
        MessageBox.error("Draft ID not found. Cannot post.");
        return;
    }

    MessageBox.confirm("Are you sure you want to post this payment?", {
        onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) { return; }

            oDataModel.setUseBatch(false);
            that._setBusyDialog(true);
            oDataModel.create("/head", {
                draftId: sDraftId,
                action:  "P"
            }, {
                success: function (oData,oResp) {

                    debugger;
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    if (oData.procStat === "E"){
                        MessageBox.error(oData.msg, {
                            onClose: function () {
                                const oRouter = that.getOwnerComponent().getRouter();
                                oRouter.navTo("RouteNewDoc");
                            }
                        });
                    }else{
                        MessageBox.success("Document " + oData.postdoc + " posted successfully for Draft ID: " + sDraftId, {
                            onClose: function () {
                                const oRouter = that.getOwnerComponent().getRouter();
                                oRouter.navTo("RouteNewDoc");
                            }
                        });
                    }
                },
                error: function (oError) {
                    that._setBusyDialog(false);
                    oDataModel.setUseBatch(true);
                    let sErrorMessage = "Failed to post payment";
                    if (oError && oError.responseText) {
                        try {
                            const oErrorResponse = JSON.parse(oError.responseText);
                            if (oErrorResponse.error && oErrorResponse.error.message && oErrorResponse.error.message.value) {
                                sErrorMessage = oErrorResponse.error.message.value;
                            }
                        } catch (e) {
                            sErrorMessage = oError.message || sErrorMessage;
                        }
                    }
                    MessageBox.error(sErrorMessage);
                }
            });
        }
    });
},
onResubmit: function() {
    const that = this;
    const oPageModel    = this.getView().getModel("pageModel");
    const sMode         = oPageModel.getProperty("/mode");
    const sSavedDraftId = oPageModel.getProperty("/draftId");
    const oDataModel    = this.getOwnerComponent().getModel();

const fnSubmit = function(sDraftId) {
    oDataModel.setUseBatch(false);
    that._setBusyDialog(true);
    oDataModel.create("/head", { draftId: sDraftId, action: "R" }, {
        success: function() {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);
            MessageBox.success("Payment submitted successfully. Draft ID: " + sDraftId, {
                onClose: function() {
                    const oRouter = that.getOwnerComponent().getRouter();
                    oRouter.navTo("RouteNewDoc");
                }
            });
        },
        error: function(oError) {
            that._setBusyDialog(false);
            oDataModel.setUseBatch(true);
            let sErrorMessage = "Failed to submit payment";
            if (oError && oError.responseText) {
                try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    if (oErrorResponse.error && oErrorResponse.error.message && oErrorResponse.error.message.value) {
                        sErrorMessage = oErrorResponse.error.message.value;
                    }
                } catch (e) {
                    sErrorMessage = oError.message || sErrorMessage;
                }
            }
            MessageBox.error(sErrorMessage);
        }
    });
};

    if (sMode === "edit") {
        // Already has draftId — update first then submit
        that.onUpdate();
        fnSubmit(sSavedDraftId);
    } else {
        // No draftId yet — save first then submit
        that.onSave();
        // After onSave succeeds it switches pageModel to edit mode and sets draftId
        // We poll pageModel to get the draftId once onSave completes
        const iMaxAttempts = 20;
        let iAttempts = 0;
        const oInterval = setInterval(function() {
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


    });
});