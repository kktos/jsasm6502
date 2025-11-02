; This is a test for 65c02 features with a YAML config
.cpu "65c02"

; Switch to the segment defined in the YAML file
.segment TESTONE

; output the symbols defined in the yaml file
.echo "START_ADDR     = ", .hex(START_ADDR)
.echo "TARGET_ADDR    = ", .hex(TARGET_ADDR)
.echo "ENABLE_FEATURE = ", ENABLE_FEATURE
.echo "FEATURE_VALUE  = ", FEATURE_VALUE

; Use a variable from the YAML file to set the origin
* = START_ADDR

main:
    ; Use a 65c02-specific instruction (Store Zero)
    stz TARGET_ADDR

.if ENABLE_FEATURE = 1
    ; This part is assembled only if ENABLE_FEATURE is 1 in the YAML
    lda #FEATURE_VALUE
    sta TARGET_ADDR+1
.else
    ; This part is assembled otherwise
    lda #$00
    sta TARGET_ADDR+1
.end

    rts
