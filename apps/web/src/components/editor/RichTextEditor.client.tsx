"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Fullscreen,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  RemoveFormat,
  Heading,
  BlockQuote,
  HorizontalLine,
  FontFamily,
  FontSize,
  FontColor,
  FontBackgroundColor,
  Highlight,
  Alignment,
  Indent,
  IndentBlock,
  List,
  ListProperties,
  TodoList,
  Link,
  CodeBlock,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  FindAndReplace,
  SelectAll,
  SpecialCharacters,
  SpecialCharactersEssentials,
  PasteFromOffice,
  Autoformat,
  type Editor,
  type EditorConfig,
} from "ckeditor5";

import "ckeditor5/ckeditor5.css";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function RichTextEditorClient({
  value,
  onChange,
  placeholder,
}: Props) {
  const editorRef = useRef<Editor | null>(null);
  const didInitRef = useRef(false);

  const config = useMemo<EditorConfig>(
    () => ({
      licenseKey: "GPL",
      plugins: [
        Essentials,
        Paragraph,
        Fullscreen,
        Autoformat,
        PasteFromOffice,
        Heading,
        Bold,
        Italic,
        Underline,
        Strikethrough,
        Code,
        RemoveFormat,
        FontFamily,
        FontSize,
        FontColor,
        FontBackgroundColor,
        Highlight,
        Alignment,
        Indent,
        IndentBlock,
        List,
        ListProperties,
        TodoList,
        Link,
        BlockQuote,
        HorizontalLine,
        CodeBlock,
        Table,
        TableToolbar,
        TableProperties,
        TableCellProperties,
        FindAndReplace,
        SelectAll,
        SpecialCharacters,
        SpecialCharactersEssentials,
      ],
      toolbar: {
        items: [
          "undo",
          "redo",
          "|",
          "heading",
          "|",
          "fontFamily",
          "fontSize",
          "|",
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "code",
          "removeFormat",
          "|",
          "fontColor",
          "fontBackgroundColor",
          "highlight",
          "|",
          "alignment",
          "|",
          "bulletedList",
          "numberedList",
          "todoList",
          "|",
          "outdent",
          "indent",
          "|",
          "link",
          "blockQuote",
          "horizontalLine",
          "|",
          "codeBlock",
          "insertTable",
          "|",
          "specialCharacters",
          "findAndReplace",
          "selectAll",
          "|",
          "fullscreen",
        ],
        shouldNotGroupWhenFull: true,
      },
      table: {
        contentToolbar: [
          "tableColumn",
          "tableRow",
          "mergeTableCells",
          "tableProperties",
          "tableCellProperties",
        ],
      },
      list: {
        properties: { styles: true, startIndex: true, reversed: true },
      },
      link: {
        addTargetToExternalLinks: true,
        decorators: {
          toggleDownloadable: {
            mode: "manual",
            label: "Downloadable",
            attributes: { download: "file" },
          },
        },
      },
      placeholder: placeholder ?? "",
    }),
    [placeholder],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !didInitRef.current) return;
    const current = editor.getData();
    if (value !== current) editor.setData(value ?? "");
  }, [value]);

  return (
    <CKEditor
      editor={ClassicEditor}
      config={config}
      onReady={(editor) => {
        editorRef.current = editor;
        editor.setData(value ?? "");
        didInitRef.current = true;
      }}
      onChange={(_, editor) => onChange(editor.getData())}
    />
  );
}
