/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["zfi/payment/management/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
