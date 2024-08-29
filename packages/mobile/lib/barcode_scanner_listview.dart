import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:FileTransfer/scanner_button_widgets.dart';
import 'package:FileTransfer/scanner_error_widget.dart';

class BarcodeScannerListView extends StatefulWidget {
  const BarcodeScannerListView({super.key});

  @override
  State<BarcodeScannerListView> createState() => _BarcodeScannerListViewState();
}

class _BarcodeScannerListViewState extends State<BarcodeScannerListView>
    with WidgetsBindingObserver {
  final MobileScannerController controller = MobileScannerController(
    torchEnabled: false,
  );
  bool isBacked = false;
  StreamSubscription<Object?>? _subscription;

  void _handleBarcode(BarcodeCapture barCodes) async {
    if (!mounted) return;

    String content = barCodes.barcodes.firstOrNull?.displayValue ?? '';
    if (content.isEmpty) return;

    if (isBacked) return;

    Navigator.pop(context, content);
    isBacked = true;
  }

  @override
  void initState() {
    super.initState();

    // Start listening to lifecycle changes.
    WidgetsBinding.instance.addObserver(this);

    // Start listening to the barcode events.
    _subscription = controller.barcodes.listen(_handleBarcode);

    // Finally, start the scanner itself.
    unawaited(controller.start());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // If the controller is not ready, do not try to start or stop it.
    // Permission dialogs can trigger lifecycle changes before the controller is ready.
    if (!controller.value.isInitialized) {
      return;
    }

    switch (state) {
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
        return;
      case AppLifecycleState.resumed:
        // Restart the scanner when the app is resumed.
        // Don't forget to resume listening to the barcode events.
        _subscription = controller.barcodes.listen(_handleBarcode);

        unawaited(controller.start());
      case AppLifecycleState.inactive:
        // Stop the scanner when the app is paused.
        // Also stop the barcode events subscription.
        unawaited(_subscription?.cancel());
        _subscription = null;
        unawaited(controller.stop());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Stack(
      children: [
        MobileScanner(
          controller: controller,
          errorBuilder: (context, error, child) {
            return ScannerErrorWidget(error: error);
          },
          fit: BoxFit.cover,
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            alignment: Alignment.bottomCenter,
            height: 80,
            color: Colors.black,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    const Spacer(),
                    AnalyzeImageFromGalleryButton(controller: controller),
                  ],
                )
              ],
            ),
          ),
        ),
      ],
    ));
  }

  @override
  Future<void> dispose() async {
    // Stop listening to lifecycle changes.
    WidgetsBinding.instance.removeObserver(this);
    // Stop listening to the barcode events.
    unawaited(_subscription?.cancel());
    _subscription = null;
    // Dispose the widget itself.
    super.dispose();
    // Finally, dispose of the controller.
    await controller.dispose();
  }
}
