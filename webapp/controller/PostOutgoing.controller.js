sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/p13n/Engine",
    "sap/m/p13n/SelectionController",
    "sap/m/p13n/SortController",
    "sap/m/p13n/FilterController",
    "sap/m/p13n/MetadataHelper",
    "sap/ui/model/Sorter",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Link",
    "sap/m/Button",
    "sap/ui/core/library",
    "sap/m/table/ColumnWidthController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(Controller, JSONModel, Engine, SelectionController, SortController, 
    FilterController, MetadataHelper, Sorter, ColumnListItem, 
    Text, Link, Button, coreLibrary, ColumnWidthController, Filter, FilterOperator, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("zfi.payment.management.controller.PostOutgoing", {
        
onInit: function() {
    const oModel = new JSONModel({
        openItems: [],
        itemsToBeCleared: []
    });
    this.getView().setModel(oModel, "openItems");
    this._registerForP13n();  // ✅ only this remains
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
_updateTableTitles: function() {
    const oModel = this.getView().getModel("openItems");
    const iOpenItems = oModel.getProperty("/openItems").length;
    const iItemsToBeCleared = oModel.getProperty("/itemsToBeCleared").length;
    
    const oOpenItemsTitle = this.byId("_IDGenTitle2");
    const oItemsToClearTitle = this.byId("_IDGenTitle3");
    
    if (oOpenItemsTitle) {
        oOpenItemsTitle.setText("Open Items (" + iOpenItems + ")");
    }
    if (oItemsToClearTitle) {
        oItemsToClearTitle.setText("Items to Be Cleared (" + iItemsToBeCleared + ")");
    }
},
        _registerForP13n: function() {
            const oTable = this.byId("openItemsTable");

            this.oMetadataHelper = new MetadataHelper([
                {
                    key: "compCode_col",
                    label: "Company Code",
                    path: "compCode"
                },
                {
                    key: "docNo_col",
                    label: "Document Number",
                    path: "docNo"
                },
                {
                    key: "yearF_col",
                    label: "Fiscal Year",
                    path: "yearF"
                },
                {
                    key: "lineItem_col",
                    label: "Line Item",
                    path: "lineItem"
                },
                {
                    key: "vendorCode_col",
                    label: "Supplier",
                    path: "vendorCode"
                },
                {
                    key: "postingDate_col",
                    label: "Posting Date",
                    path: "postingDate"
                },
                {
                    key: "docType_col",
                    label: "Document Type",
                    path: "docType"
                },
                {
                    key: "amntLC_col",
                    label: "Amount in Loc. Curr.",
                    path: "amntLC"
                },
                {
                    key: "amntDC_col",
                    label: "Amount in Doc. Curr.",
                    path: "amntDC"
                },
                {
                    key: "baseDate_col",
                    label: "Baseline Payment Date",
                    path: "baseDate"
                },
                {
                    key: "extRef_col",
                    label: "Reference",
                    path: "extRef"
                },
                {
                    key: "assignNo_col",
                    label: "Assignment",
                    path: "assignNo"
                },
                {
                    key: "spGl_col",
                    label: "Special G/L Ind.",
                    path: "spGl"
                },
                {
                    key: "debCredInd_col",
                    label: "Debit/Credit Ind.",
                    path: "debCredInd"
                },
                {
                    key: "postKey_col",
                    label: "Posting Key",
                    path: "postKey"
                }
            ]);

            Engine.getInstance().register(oTable, {
                helper: this.oMetadataHelper,
                controller: {
                    Columns: new SelectionController({
                        targetAggregation: "columns",
                        control: oTable
                    }),
                    Sorter: new SortController({
                        control: oTable
                    }),
                    ColumnWidth: new ColumnWidthController({
                        control: oTable
                    }),
                    Filter: new FilterController({
                        control: oTable
                    })
                }
            });

            Engine.getInstance().attachStateChange(this.handleStateChange.bind(this));
        },

// handleStateChange: function(oEvt) {
//     const oTable = this.byId("openItemsTable");
//     const oState = oEvt.getParameter("state");

//     if (!oState) {
//         return;
//     }

//     this.updateColumns(oState);
//     const aFilter = this.createFilters(oState);
//     const aSorter = this.createSorters(oState);

//     // Create cells for ALL fields in the EXACT order as columns in XML
//     const aCells = [
//         // compCode - Column 1
//         new Text({ text: "{openItems>compCode}" }),
//         // docNo - Column 2
//         new Link({ text: "{openItems>docNo}" }),
//         // yearF - Column 3
//         new Text({ text: "{openItems>yearF}" }),
//         // lineItem - Column 4
//         new Text({ text: "{openItems>lineItem}" }),
//         // vendorCode - Column 5
//         new Text({ text: "{openItems>vendorCode}" }),
//         // postingDate - Column 6
//         new Text({
//             text: {
//                 path: "openItems>postingDate",
//                 formatter: function(value) {
//                     if (value) {
//                         const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
//                             pattern: "MM/dd/yyyy"
//                         });
//                         return oDateFormat.format(new Date(value));
//                     }
//                     return "";
//                 }
//             }
//         }),
//         // docType - Column 7
//         new Text({ text: "{openItems>docType}" }),
//         // amntLC - Column 8
//         new Text({
//             text: {
//                 path: "openItems>amntLC",
//                 formatter: function(value) {
//                     if (value !== null && value !== undefined) {
//                         return parseFloat(value).toFixed(2);
//                     }
//                     return "";
//                 }
//             }
//         }),
//         // amntDC - Column 9
//         new Text({
//             text: {
//                 path: "openItems>amntDC",
//                 formatter: function(value) {
//                     if (value !== null && value !== undefined) {
//                         return parseFloat(value).toFixed(2);
//                     }
//                     return "";
//                 }
//             }
//         }),
//         // baseDate - Column 10
//         new Text({
//             text: {
//                 path: "openItems>baseDate",
//                 formatter: function(value) {
//                     if (value) {
//                         const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
//                             pattern: "MM/dd/yyyy"
//                         });
//                         return oDateFormat.format(new Date(value));
//                     }
//                     return "";
//                 }
//             }
//         }),
//         // extRef - Column 11
//         new Text({ text: "{openItems>extRef}" }),
//         // assignNo - Column 12
//         new Text({ text: "{openItems>assignNo}" }),
//         // spGl - Column 13
//         new Text({ text: "{openItems>spGl}" }),
//         // debCredInd - Column 14
//         new Text({ text: "{openItems>debCredInd}" }),
//         // postKey - Column 15
//         new Text({ text: "{openItems>postKey}" }),
//         // Clear button - Column 16
//         new Button({
//             icon: "sap-icon://accept",
//             type: "Emphasized",
//             press: this.onClearItem.bind(this)
//         })
//     ];

//     oTable.bindItems({
//         templateShareable: false,
//         path: 'openItems>/openItems',
//         sorter: aSorter,
//         filters: aFilter,
//         template: new ColumnListItem({
//             cells: aCells
//         })
//     });
// },


handleStateChange: function(oEvt) {
    const oTable = this.byId("openItemsTable");
    const oState = oEvt.getParameter("state");

    if (!oState) {
        return;
    }

    this.updateColumns(oState);
    const aFilter = this.createFilters(oState);
    const aSorter = this.createSorters(oState);

    // Define all possible cells by their p13n key
    const mCellDefinitions = {
        "compCode_col": function() {
            return new Text({ text: "{openItems>compCode}" });
        },
        "docNo_col": function() {
            return new Link({ text: "{openItems>docNo}" });
        },
        "yearF_col": function() {
            return new Text({ text: "{openItems>yearF}" });
        },
        "lineItem_col": function() {
            return new Text({ text: "{openItems>lineItem}" });
        },
        "vendorCode_col": function() {
            return new Text({ text: "{openItems>vendorCode}" });
        },
        "postingDate_col": function() {
            return new Text({
                text: {
                    path: "openItems>postingDate",
                    type: "sap.ui.model.type.Date",
                    formatOptions: { pattern: "MM/dd/yyyy" }
                }
            });
        },
        "docType_col": function() {
            return new Text({ text: "{openItems>docType}" });
        },
        "amntLC_col": function() {
            return new Text({
                text: {
                    path: "openItems>amntLC",
                    formatter: function(value) {
                        if (value !== null && value !== undefined) {
                            return parseFloat(value).toFixed(2);
                        }
                        return "";
                    }
                }
            });
        },
        "amntDC_col": function() {
            return new Text({
                text: {
                    path: "openItems>amntDC",
                    formatter: function(value) {
                        if (value !== null && value !== undefined) {
                            return parseFloat(value).toFixed(2);
                        }
                        return "";
                    }
                }
            });
        },
        "baseDate_col": function() {
            return new Text({
                text: {
                    path: "openItems>baseDate",
                    type: "sap.ui.model.type.Date",
                    formatOptions: { pattern: "MM/dd/yyyy" }
                }
            });
        },
        "extRef_col": function() {
            return new Text({ text: "{openItems>extRef}" });
        },
        "assignNo_col": function() {
            return new Text({ text: "{openItems>assignNo}" });
        },
        "spGl_col": function() {
            return new Text({ text: "{openItems>spGl}" });
        },
        "debCredInd_col": function() {
            return new Text({ text: "{openItems>debCredInd}" });
        },
        "postKey_col": function() {
            return new Text({ text: "{openItems>postKey}" });
        }
    };

    const oClearColumn = this.byId("clearColumn");

    // Build cells by iterating actual DOM column order (after updateColumns reordered them)
    const aCells = oTable.getColumns().map(function(oColumn) {
        // If this is the clear button column, return the button
        if (oColumn === oClearColumn) {
            return new Button({
                icon: "sap-icon://accept",
                type: "Emphasized",
                press: this.onClearItem.bind(this)
            });
        }

        // For all other columns, look up by p13n key
        const sKey = this._getKey(oColumn);
        if (sKey && mCellDefinitions[sKey]) {
            return mCellDefinitions[sKey]();
        }

        // Fallback empty cell to keep column/cell count in sync
        return new Text({ text: "" });
    }.bind(this));

    oTable.bindItems({
        templateShareable: false,
        path: "openItems>/openItems",
        sorter: aSorter,
        filters: aFilter,
        template: new ColumnListItem({
            cells: aCells
        })
    });
},

        createFilters: function(oState) {
            const aFilter = [];
            Object.keys(oState.Filter).forEach((sFilterKey) => {
                const filterPath = this.oMetadataHelper.getProperty(sFilterKey).path;

                oState.Filter[sFilterKey].forEach(function(oCondition) {
                    aFilter.push(new Filter(filterPath, oCondition.operator, oCondition.values[0]));
                });
            });

            // Show/hide filter info bar
            const oFilterInfo = this.byId("filterInfo");
            if (oFilterInfo) {
                oFilterInfo.setVisible(aFilter.length > 0);
            }

            return aFilter;
        },

        createSorters: function(oState) {
            const aSorter = [];
            oState.Sorter.forEach(function(oSorter) {
                aSorter.push(new Sorter(this.oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
            }.bind(this));

            oState.Sorter.forEach((oSorter) => {
                const oCol = this.byId("openItemsTable").getColumns().find((oColumn) => oColumn.data("p13nKey") === oSorter.key);
                if (oCol && oSorter.sorted !== false) {
                    oCol.setSortIndicator(oSorter.descending ? coreLibrary.SortOrder.Descending : coreLibrary.SortOrder.Ascending);
                }
            });

            return aSorter;
        },

        updateColumns: function(oState) {
            const oTable = this.byId("openItemsTable");
            const oClearColumn = this.byId("clearColumn"); // Get clear button column

            oTable.getColumns().forEach((oColumn) => {
                // Skip the clear button column
                if (oColumn === oClearColumn) {
                    return;
                }
                
                oColumn.setVisible(false);
                const sKey = this._getKey(oColumn);
                if (sKey && oState.ColumnWidth[sKey]) {
                    oColumn.setWidth(oState.ColumnWidth[sKey]);
                }
                oColumn.setSortIndicator(coreLibrary.SortOrder.None);
            });

            oState.Columns.forEach((oProp, iIndex) => {
                const oCol = oTable.getColumns().find((oColumn) => oColumn.data("p13nKey") === oProp.key);
                if (oCol) {
                    oCol.setVisible(true);
                    oTable.removeColumn(oCol);
                    oTable.insertColumn(oCol, iIndex);
                }
            });

            // Ensure clear column is always last
            if (oClearColumn) {
                oTable.removeColumn(oClearColumn);
                oTable.addColumn(oClearColumn);
            }
        },

        _getKey: function(oControl) {
            return oControl.data("p13nKey");
        },

        openPersoDialog: function(oEvt) {
            this._openPersoDialog(["Columns", "Sorter", "Filter"], oEvt.getSource());
        },

        _openPersoDialog: function(aPanels, oSource) {
            const oTable = this.byId("openItemsTable");

            Engine.getInstance().show(oTable, aPanels, {
                contentHeight: aPanels.length > 1 ? "50rem" : "35rem",
                contentWidth: aPanels.length > 1 ? "45rem" : "32rem",
                source: oSource || oTable
            });
        },

        beforeOpenColumnMenu: function(oEvt) {
            const oMenu = this.byId("menu");
            const oColumn = oEvt.getParameter("openBy");
            const oSortItem = oMenu.getQuickActions()[0].getItems()[0];

            oSortItem.setKey(this._getKey(oColumn));
            oSortItem.setLabel(oColumn.getHeader().getText());
            oSortItem.setSortOrder(oColumn.getSortIndicator());
        },

        onSort: function(oEvt) {
            const oSortItem = oEvt.getParameter("item");
            const oTable = this.byId("openItemsTable");
            const sAffectedProperty = oSortItem.getKey();
            const sSortOrder = oSortItem.getSortOrder();

            Engine.getInstance().retrieveState(oTable).then(function(oState) {
                oState.Sorter.forEach(function(oSorter) {
                    oSorter.sorted = false;
                });

                if (sSortOrder !== coreLibrary.SortOrder.None) {
                    oState.Sorter.push({
                        key: sAffectedProperty,
                        descending: sSortOrder === coreLibrary.SortOrder.Descending
                    });
                }

                Engine.getInstance().applyState(oTable, oState);
            });
        },

        onColumnMove: function(oEvt) {
            const oDraggedColumn = oEvt.getParameter("draggedControl");
            const oDroppedColumn = oEvt.getParameter("droppedControl");

            if (oDraggedColumn === oDroppedColumn) {
                return;
            }

            const oTable = this.byId("openItemsTable");
            const oClearColumn = this.byId("clearColumn");
            
            // Prevent moving the clear column
            if (oDraggedColumn === oClearColumn || oDroppedColumn === oClearColumn) {
                return;
            }

            const sDropPosition = oEvt.getParameter("dropPosition");
            const iDraggedIndex = oTable.indexOfColumn(oDraggedColumn);
            const iDroppedIndex = oTable.indexOfColumn(oDroppedColumn);
            const iNewPos = iDroppedIndex + (sDropPosition === "Before" ? 0 : 1) + (iDraggedIndex < iDroppedIndex ? -1 : 0);
            const sKey = this._getKey(oDraggedColumn);

            Engine.getInstance().retrieveState(oTable).then(function(oState) {
                const oCol = oState.Columns.find(function(oColumn) {
                    return oColumn.key === sKey;
                }) || {
                    key: sKey
                };
                oCol.position = iNewPos;

                Engine.getInstance().applyState(oTable, {
                    Columns: [oCol]
                });
            });
        },

        onColumnResize: function(oEvt) {
            const oColumn = oEvt.getParameter("column");
            const sWidth = oEvt.getParameter("width");
            const oTable = this.byId("openItemsTable");

            const oColumnState = {};
            oColumnState[this._getKey(oColumn)] = sWidth;

            Engine.getInstance().applyState(oTable, {
                ColumnWidth: oColumnState
            });
        },

        onClearFilterPress: function() {
            const oTable = this.byId("openItemsTable");
            Engine.getInstance().retrieveState(oTable).then(function(oState) {
                for (var sKey in oState.Filter) {
                    oState.Filter[sKey].map((condition) => {
                        condition.filtered = false;
                    });
                }
                Engine.getInstance().applyState(oTable, oState);
            });
        },

        onFilterInfoPress: function(oEvt) {
            this._openPersoDialog(["Filter"], oEvt.getSource());
        },

onClearItem: function(oEvt) {
    const oButton = oEvt.getSource();
    const oContext = oButton.getBindingContext("openItems");

    if (!oContext) {
        return;
    }

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
    this._rebindOpenItemsTable();

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
    const oVendorInput = this.byId("supplierAccountInput");
    const sVendor = oVendorInput ? oVendorInput.getValue().trim() : "";

    if (!sVendor) {
        MessageToast.show("Please enter a vendor first");
        return;
    }

    this._loadOpenItems(sVendor);
},

        onNavBack: function() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteNewDoc");
        }
    });
});