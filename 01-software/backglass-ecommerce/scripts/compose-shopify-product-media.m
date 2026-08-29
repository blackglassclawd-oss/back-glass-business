#import <AppKit/AppKit.h>

static NSDictionary *Asset(NSString *slug, NSString *number, NSString *suffix) {
    return @{ @"slug": slug, @"number": number, @"suffix": suffix ?: [NSNull null] };
}

int main(void) {
    @autoreleasepool {
        NSArray<NSDictionary *> *assets = @[
            Asset(@"iphone-14-plus-blue", @"14", @"PLUS"),
            Asset(@"iphone-14-plus-purple", @"14", @"PLUS"),
            Asset(@"iphone-14-plus-starlight", @"14", @"PLUS"),
            Asset(@"iphone-15-blue", @"15", nil),
            Asset(@"iphone-15-green", @"15", nil),
            Asset(@"iphone-15-pink", @"15", nil),
            Asset(@"iphone-15-pro-max-natural", @"15", @"PRO MAX"),
            Asset(@"iphone-15-pro-max-black", @"15", @"PRO MAX"),
            Asset(@"iphone-15-pro-max-blue", @"15", @"PRO MAX"),
            Asset(@"iphone-16-pro-desert", @"16", @"PRO"),
            Asset(@"iphone-16-pro-natural", @"16", @"PRO"),
            Asset(@"iphone-16-pro-white", @"16", @"PRO"),
            Asset(@"iphone-16-pro-max-desert", @"16", @"PRO MAX"),
            Asset(@"iphone-16-pro-max-natural", @"16", @"PRO MAX"),
            Asset(@"iphone-16-pro-max-white", @"16", @"PRO MAX"),
        ];

        NSFileManager *fileManager = NSFileManager.defaultManager;
        NSString *root = fileManager.currentDirectoryPath;
        NSString *sourceDirectory = [root stringByAppendingPathComponent:@"data/source-media/phonelcdparts/2026-08-06"];
        NSString *outputDirectory = [root stringByAppendingPathComponent:@"public/product-media/shopify-corrections-2026-08-06"];
        [fileManager createDirectoryAtPath:outputDirectory withIntermediateDirectories:YES attributes:nil error:nil];

        const NSInteger width = 2000;
        const NSInteger height = 2500;
        NSFont *numberFont = [NSFont fontWithName:@"HelveticaNeue-Bold" size:850] ?: [NSFont boldSystemFontOfSize:850];
        NSColor *labelColor = [NSColor colorWithCalibratedWhite:0.28 alpha:0.48];

        for (NSDictionary *asset in assets) {
            NSString *slug = asset[@"slug"];
            NSString *sourcePath = [sourceDirectory stringByAppendingPathComponent:[slug stringByAppendingPathExtension:@"jpg"]];
            NSString *outputPath = [outputDirectory stringByAppendingPathComponent:[slug stringByAppendingPathExtension:@"jpg"]];
            NSImage *source = [[NSImage alloc] initWithContentsOfFile:sourcePath];
            if (!source) {
                NSLog(@"Cannot read %@", sourcePath);
                return 1;
            }

            NSBitmapImageRep *bitmap = [[NSBitmapImageRep alloc]
                initWithBitmapDataPlanes:nil
                pixelsWide:width
                pixelsHigh:height
                bitsPerSample:8
                samplesPerPixel:4
                hasAlpha:YES
                isPlanar:NO
                colorSpaceName:NSDeviceRGBColorSpace
                bytesPerRow:0
                bitsPerPixel:0];
            NSGraphicsContext *context = [NSGraphicsContext graphicsContextWithBitmapImageRep:bitmap];
            [NSGraphicsContext saveGraphicsState];
            NSGraphicsContext.currentContext = context;

            [NSColor.whiteColor setFill];
            NSRectFill(NSMakeRect(0, 0, width, height));

            CGFloat scale = MIN(width / source.size.width, height / source.size.height);
            NSSize imageSize = NSMakeSize(source.size.width * scale, source.size.height * scale);
            NSRect imageRect = NSMakeRect((width - imageSize.width) / 2, (height - imageSize.height) / 2, imageSize.width, imageSize.height);
            [source drawInRect:imageRect fromRect:NSZeroRect operation:NSCompositingOperationSourceOver fraction:1 respectFlipped:NO hints:nil];

            NSString *number = asset[@"number"];
            NSDictionary *numberAttributes = @{ NSFontAttributeName: numberFont, NSForegroundColorAttributeName: labelColor };
            CGFloat numberWidth = [number sizeWithAttributes:numberAttributes].width;
            id rawSuffix = asset[@"suffix"];
            BOOL hasSuffix = rawSuffix != NSNull.null;
            [number drawAtPoint:NSMakePoint(MAX(20, (950 - numberWidth) / 2), hasSuffix ? 770 : 610) withAttributes:numberAttributes];

            if (hasSuffix) {
                NSString *suffix = rawSuffix;
                CGFloat fontSize = [suffix isEqualToString:@"PRO MAX"] ? 255 : 330;
                NSFont *suffixFont = [NSFont fontWithName:@"HelveticaNeue-Bold" size:fontSize] ?: [NSFont boldSystemFontOfSize:fontSize];
                NSDictionary *suffixAttributes = @{ NSFontAttributeName: suffixFont, NSForegroundColorAttributeName: labelColor };
                CGFloat suffixWidth = [suffix sizeWithAttributes:suffixAttributes].width;
                if (suffixWidth > 850) {
                    fontSize *= 850 / suffixWidth;
                    suffixFont = [NSFont fontWithName:@"HelveticaNeue-Bold" size:fontSize] ?: [NSFont boldSystemFontOfSize:fontSize];
                    suffixAttributes = @{ NSFontAttributeName: suffixFont, NSForegroundColorAttributeName: labelColor };
                    suffixWidth = [suffix sizeWithAttributes:suffixAttributes].width;
                }
                [suffix drawAtPoint:NSMakePoint((950 - suffixWidth) / 2, 445) withAttributes:suffixAttributes];
            }

            [context flushGraphics];
            [NSGraphicsContext restoreGraphicsState];

            NSData *jpeg = [bitmap representationUsingType:NSBitmapImageFileTypeJPEG properties:@{ NSImageCompressionFactor: @0.94 }];
            if (![jpeg writeToFile:outputPath atomically:YES]) {
                NSLog(@"Cannot write %@", outputPath);
                return 1;
            }
            printf("%s\n", outputPath.UTF8String);
        }
    }
    return 0;
}
